import SwiftUI
import WebKit
import StoreKit
import Combine
import UIKit

// ==========================================
// 1. THE SETTINGS (CONFIG)
// ==========================================
private let productID = "com.steveforde.quickcoverletter.credit_v2"

// ==========================================
// 2. THE ENGINE (StoreKitService)
// ==========================================
class StoreKitService: ObservableObject {
    
    @Published var product: Product?
    @Published var isPurchasing = false
    
    // ⚠️ IMPORTANT: This must be 'weak' to prevent memory leaks
    weak var webView: WKWebView?
    
    init() {
        print("🚀 STOREKIT SERVICE STARTED")
        Task { await loadProduct() }
    }
    
    // ✅ JS EXECUTOR
    @MainActor
    func callJS(_ script: String) async {
        guard let webView = webView else {
            print("⚠️ WebView is nil, cannot execute JS")
            return
        }
        
        do {
            try await webView.evaluateJavaScript(script)
            print("📤 JS Executed: \(script)")
        } catch {
            print("❌ JS Execution Error: \(error.localizedDescription)")
        }
    }
    
    func loadProduct() async {
        print("🔎 LOOKING FOR PRODUCT ID: \(productID)")
        do {
            let products = try await Product.products(for: [productID])
            if let p = products.first {
                await MainActor.run { self.product = p }
                print("✅ PRODUCT FOUND: \(p.displayName) - \(p.displayPrice)")
            } else {
                print("⛔️ ERROR: Product list is EMPTY. Check App Store Connect or Scheme!")
            }
        } catch {
            print("❌ CRITICAL ERROR: Failed to load product. \(error)")
        }
    }
    
    func purchase(email: String) async {
        print("💰 PURCHASE REQUESTED FOR: \(email)")
        
        guard let product = product else {
            print("💀 FATAL: Cannot buy because 'product' is missing.")
            await callJS("alert('Error: In-App Purchase Product not found.');")
            return
        }
        
        await MainActor.run { isPurchasing = true }
        
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                print("🎉 PURCHASE SUCCESSFUL!")
                await callJS("handleIAPSuccess('\(email)')")
                
                if case .verified(let transaction) = verification {
                    await transaction.finish()
                }
            case .userCancelled:
                print("⚠️ User cancelled.")
                await callJS("alert('Purchase Cancelled');")
            case .pending:
                print("⏳ Pending.")
            @unknown default:
                break
            }
        } catch {
            print("❌ PURCHASE FAILED: \(error)")
            await callJS("alert('Purchase Failed: \(error.localizedDescription)');")
        }
        await MainActor.run { isPurchasing = false }
    }
}

// ==========================================
// 3. THE TRANSMISSION (WebView Logic)
// ==========================================
class WebViewCoordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    var storeKitService: StoreKitService
    
    init(storeKitService: StoreKitService) {
        self.storeKitService = storeKitService
    }
    
    // Listen for messages from the Website
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        
        // ✅ CASE A: LOGGING (Kept for safety/debugging)
        if message.name == "log", let logStr = message.body as? String {
            print("JavaScript 📢: \(logStr)")
            return
        }
        
        // CASE B: Purchase Request
        if message.name == "purchase", let email = message.body as? String {
            print("✅ PURCHASE CLICK RECEIVED! Email: \(email)")
            Task { await storeKitService.purchase(email: email) }
        }
        
        // CASE C: Download PDF Request
        if message.name == "downloadPDF",
           let dataDict = message.body as? [String: String],
           let base64String = dataDict["fileData"],
           let fileName = dataDict["fileName"] {
            
            print("📥 PDF DATA RECEIVED for: \(fileName)")
            saveAndShareBase64(base64String: base64String, fileName: fileName)
        }
    }
    
    func saveAndShareBase64(base64String: String, fileName: String) {
        let cleanString = base64String.components(separatedBy: ",").last ?? base64String
        
        guard let pdfData = Data(base64Encoded: cleanString, options: .ignoreUnknownCharacters) else {
            print("❌ Error: Could not convert base64 to data")
            return
        }
        
        let fileManager = FileManager.default
        let tempDirectory = fileManager.temporaryDirectory
        let finalURL = tempDirectory.appendingPathComponent(fileName)
        
        do {
            try? fileManager.removeItem(at: finalURL)
            try pdfData.write(to: finalURL)
            print("✅ File saved to: \(finalURL.path)")
            
            DispatchQueue.main.async {
                self.presentShareSheet(for: finalURL)
            }
        } catch {
            print("❌ File write error: \(error)")
        }
    }
    
    func presentShareSheet(for url: URL) {
        guard let rootVC = UIApplication.shared.findKeyWindow()?.rootViewController else { return }
        
        let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        
        if let popover = activityVC.popoverPresentationController {
            popover.sourceView = rootVC.view
            popover.sourceRect = CGRect(x: rootVC.view.bounds.midX, y: rootVC.view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        
        rootVC.present(activityVC, animated: true)
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("⚡️ Page Loaded.")
        let setupScript = """
            window.isIOSApp = true;
            window.isInApp = true;
            var btn = document.getElementById('payButton');
            if(btn) { 
                btn.disabled = false; 
                btn.textContent = 'Pay €1.99 to Unlock';
            }
        """
        webView.evaluateJavaScript(setupScript)
    }
}

struct WebKitView: UIViewRepresentable {
    @ObservedObject var storeKitService: StoreKitService
    private let urlString = "https://quickcoverletter.onrender.com"

    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()
        
        // ✅ REGISTER HANDLERS
        contentController.add(context.coordinator, name: "purchase")
        contentController.add(context.coordinator, name: "downloadPDF")
        contentController.add(context.coordinator, name: "log")
        
        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        // ✅ Keep persistence so users stay logged in/keep session
        config.websiteDataStore = WKWebsiteDataStore.default()
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.customUserAgent = "QuickCoverLetter_iOS_App"
        webView.navigationDelegate = context.coordinator
        storeKitService.webView = webView
        
        // ✅ PRODUCTION MODE: No timestamp.
        // This allows the app to load instantly from cache.
        if let url = URL(string: urlString) {
            print("🌍 Loading Production URL: \(urlString)")
            webView.load(URLRequest(url: url))
        }
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    
    func makeCoordinator() -> WebViewCoordinator {
        return WebViewCoordinator(storeKitService: storeKitService)
    }
}

struct ContentView: View {
    @StateObject private var storeKitService = StoreKitService()

    var body: some View {
        WebKitView(storeKitService: storeKitService)
            .edgesIgnoringSafeArea(.all)
    }
}

// ==========================================
// 5. HELPER EXTENSION
// ==========================================
extension UIApplication {
    func findKeyWindow() -> UIWindow? {
        return connectedScenes
            .filter { $0.activationState == .foregroundActive }
            .first(where: { $0 is UIWindowScene })
            .flatMap({ $0 as? UIWindowScene })?.windows
            .first(where: \.isKeyWindow)
    }
}
