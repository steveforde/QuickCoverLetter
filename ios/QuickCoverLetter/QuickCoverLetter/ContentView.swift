import SwiftUI
import WebKit
import StoreKit
import Combine

// ==========================================
// 1. THE SETTINGS (CONFIG)
// ==========================================
// 🟢 UPDATED: This now matches your new App Store Connect ID
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
    
    // Listen for the website button click
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "purchase", let email = message.body as? String {
            print("✅ CLICK RECEIVED! Email: \(email)")
            Task { await storeKitService.purchase(email: email) }
        }
    }
    
    // When page loads, tell it we are an App
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("⚡️ Page Loaded.")
        let setupScript = """
            window.isIOSApp = true;
            window.isInApp = true;
            // Enable button if hidden
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
        contentController.add(context.coordinator, name: "purchase")
        
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
