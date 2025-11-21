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
    var webView: WKWebView?
    
    init() {
        print("🚀 STOREKIT SERVICE STARTED")
        Task { await loadProduct() }
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
            case .pending:
                print("⏳ Pending.")
            @unknown default:
                break
            }
        } catch {
            print("❌ PURCHASE FAILED: \(error)")
        }
        await MainActor.run { isPurchasing = false }
    }
    
    private func callJS(_ javascript: String) async {
        await MainActor.run {
            webView?.evaluateJavaScript(javascript)
        }
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
        
        // CASE A: Purchase Request
        if message.name == "purchase", let email = message.body as? String {
            print("✅ PURCHASE CLICK RECEIVED! Email: \(email)")
            Task { await storeKitService.purchase(email: email) }
        }
        
        // CASE B: Download PDF Request (Handles Base64 Data from jsPDF)
        if message.name == "downloadPDF",
           let dataDict = message.body as? [String: String],
           let base64String = dataDict["fileData"],
           let fileName = dataDict["fileName"] {
            
            print("📥 PDF DATA RECEIVED for: \(fileName)")
            saveAndShareBase64(base64String: base64String, fileName: fileName)
        }
    }
    
    // Logic to convert Base64 string to file and Share
    func saveAndShareBase64(base64String: String, fileName: String) {
        // 1. Clean the data string (remove "data:application/pdf;base64," prefix)
        let cleanString = base64String.components(separatedBy: ",").last ?? base64String
        
        // 2. Convert to Data
        guard let pdfData = Data(base64Encoded: cleanString, options: .ignoreUnknownCharacters) else {
            print("❌ Error: Could not convert base64 to data")
            return
        }
        
        // 3. Save to Temp Directory
        let fileManager = FileManager.default
        let tempDirectory = fileManager.temporaryDirectory
        let finalURL = tempDirectory.appendingPathComponent(fileName)
        
        do {
            // Overwrite if exists
            try? fileManager.removeItem(at: finalURL)
            try pdfData.write(to: finalURL)
            print("✅ File saved to: \(finalURL.path)")
            
            // 4. Present Share Sheet on Main Thread
            DispatchQueue.main.async {
                self.presentShareSheet(for: finalURL)
            }
        } catch {
            print("❌ File write error: \(error)")
        }
    }
    
    // 🟢 ROBUST SHARE SHEET FOR IPAD
    func presentShareSheet(for url: URL) {
        guard let rootVC = UIApplication.shared.findKeyWindow()?.rootViewController else { return }
        
        let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        
        // IPAD CRASH FIX: Anchor the popover
        if let popover = activityVC.popoverPresentationController {
            popover.sourceView = rootVC.view
            // Center it on screen
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
        
        // Register Handlers
        contentController.add(context.coordinator, name: "purchase")
        contentController.add(context.coordinator, name: "downloadPDF") // <--- ENSURE THIS IS HERE
        
        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        
        // 🔴 FORCE NO CACHE (The "Incognito" mode)
        config.websiteDataStore = WKWebsiteDataStore.nonPersistent()
        
        let webView = WKWebView(frame: .zero, configuration: config)
        
        // 🟢 GUIDELINE 3.1.1
        webView.customUserAgent = "QuickCoverLetter_iOS_App"
        
        webView.navigationDelegate = context.coordinator
        storeKitService.webView = webView
        
        // 🔴 FORCE SERVER UPDATE
        // Adds ?t=12345 to the URL so the server sends fresh files
        let timestamp = Date().timeIntervalSince1970
        let uniqueURLString = "\(urlString)?t=\(timestamp)"
        
        if let url = URL(string: uniqueURLString) {
            print("🌍 Loading URL: \(uniqueURLString)")
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
