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
                // Tell the website we won!
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
        
        // CASE B: Download PDF Request (Added for the Fix)
        // JS Usage: window.webkit.messageHandlers.downloadPDF.postMessage("https://url.com/file.pdf")
        if message.name == "downloadPDF", let urlString = message.body as? String, let url = URL(string: urlString) {
            print("📥 DOWNLOAD REQUEST RECEIVED: \(url)")
            downloadAndShare(url: url)
        }
    }
    
    // Logic to download file to temp storage then show Share Sheet
    func downloadAndShare(url: URL) {
        let task = URLSession.shared.downloadTask(with: url) { localURL, response, error in
            guard let localURL = localURL, error == nil else {
                print("Download failed: \(error?.localizedDescription ?? "Unknown error")")
                return
            }
            
            // Move file to a temporary location with correct extension (e.g., .pdf)
            let fileManager = FileManager.default
            let tempDirectory = fileManager.temporaryDirectory
            let fileName = response?.suggestedFilename ?? "CoverLetter.pdf"
            let finalURL = tempDirectory.appendingPathComponent(fileName)
            
            do {
                // Remove existing file if necessary
                if fileManager.fileExists(atPath: finalURL.path) {
                    try fileManager.removeItem(at: finalURL)
                }
                try fileManager.moveItem(at: localURL, to: finalURL)
                
                // Present Share Sheet on Main Thread
                DispatchQueue.main.async {
                    self.presentShareSheet(for: finalURL)
                }
            } catch {
                print("File move error: \(error)")
            }
        }
        task.resume()
    }
    
    // 🟢 THE FIX: Robust Share Sheet for iPad
    func presentShareSheet(for url: URL) {
        guard let rootVC = UIApplication.shared.findKeyWindow()?.rootViewController else { return }
        
        let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        
        // IPAD CRASH FIX: Anchor the popover
        if let popover = activityVC.popoverPresentationController {
            popover.sourceView = rootVC.view
            // Center it on screen since we don't have a specific button frame
            popover.sourceRect = CGRect(x: rootVC.view.bounds.midX, y: rootVC.view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        
        rootVC.present(activityVC, animated: true)
    }
    
    // When page loads, tell it we are an App
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
        contentController.add(context.coordinator, name: "downloadPDF") // <--- Added this
        
        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        
        let webView = WKWebView(frame: .zero, configuration: config)
        
        // 🟢 CRITICAL FOR APPLE REVIEW (Guideline 3.1.1)
        webView.customUserAgent = "QuickCoverLetter_iOS_App"
        
        webView.navigationDelegate = context.coordinator
        storeKitService.webView = webView
        
        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    
    func makeCoordinator() -> WebViewCoordinator {
        return WebViewCoordinator(storeKitService: storeKitService)
    }
}

// ==========================================
// 4. THE DASHBOARD (ContentView)
// ==========================================
struct ContentView: View {
    
    @StateObject private var storeKitService = StoreKitService()

    var body: some View {
        // The Website fills the whole screen
        WebKitView(storeKitService: storeKitService)
            .edgesIgnoringSafeArea(.all)
            .onAppear {
                print("✅ ContentView Loaded. Ready for business.")
            }
    }
}

// ==========================================
// 5. HELPER EXTENSION
// ==========================================
// This helps us find the "Main Screen" to attach the iPad popup to
extension UIApplication {
    func findKeyWindow() -> UIWindow? {
        return connectedScenes
            .filter { $0.activationState == .foregroundActive }
            .first(where: { $0 is UIWindowScene })
            .flatMap({ $0 as? UIWindowScene })?.windows
            .first(where: \.isKeyWindow)
    }
}
