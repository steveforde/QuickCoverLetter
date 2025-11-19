import SwiftUI
import WebKit
import Foundation

// ===================================================
// 1. Coordinator (The Listener & Delegate)
// Must inherit from NSObject and conform to both protocols
// ===================================================
class WebViewCoordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate { 
    
    // Reference to the payment service
    var storeKitService: StoreKitService 
    
    init(storeKitService: StoreKitService) {
        self.storeKitService = storeKitService
    }
    
    // In your WebViewCoordinator class:
func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    if message.name == "purchase", let email = message.body as? String {
        print("JS → Swift: purchase requested for \(email)")
        Task {
            // 🟢 CRITICAL FIX: Change the name here to match the StoreKitService function
            await service.purchase(email: email) 
        }
    }
}
    
    // --- 1b. WKNavigationDelegate (Fixes the Timing Error) ---
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("Web content loaded. Unlocking JavaScript button.")
        
        // CRITICAL FIX: The minimal and safest command to enable the button.
        let enableScript = """
            document.getElementById('payButton').disabled = false; 
            document.getElementById('payButton').textContent = 'Pay €1.99 to Unlock a letter';
        """
        // Evaluate JavaScript to enable the button
        webView.evaluateJavaScript(enableScript)
    }
}


// ===================================================
// 2. WebKitView (The SwiftUI View)
// ===================================================
struct WebKitView: UIViewRepresentable {
    
    @ObservedObject var storeKitService: StoreKitService 
    private let urlString = "https://quickcoverletter.onrender.com" 

    func makeUIView(context: Context) -> WKWebView {
        
        let contentController = WKUserContentController()
        
        // Add the Coordinator as a message handler for the name "purchase"
        contentController.add(context.coordinator, name: "purchase")
        
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        
        // Set both delegates to the Coordinator
        webView.navigationDelegate = context.coordinator 
        
        // Store the webView reference for the success callback
        storeKitService.webView = webView 
        
        // Load the website
        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    
    // Creates the instance of the Coordinator 
    func makeCoordinator() -> WebViewCoordinator {
        // Pass the StoreKitService to the coordinator 
        return WebViewCoordinator(storeKitService: storeKitService)
    }
}
