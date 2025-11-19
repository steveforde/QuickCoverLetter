import SwiftUI
import WebKit
import Foundation

// ===================================================
// 1. WebViewCoordinator (The JavaScript Listener & Page Loader)
// This class handles all communication events from the WebView.
// ===================================================
class WebViewCoordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate { 
    
    var storeKitService: StoreKitService
    
    init(storeKitService: StoreKitService) {
        self.storeKitService = storeKitService
    }
    
    // --- WKScriptMessageHandler (Receives "purchase" message from JS) ---
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        
        // Check if the message name is the one we expect: "purchase"
        if message.name == "purchase" {
            
            if let email = message.body as? String {
                print("Received purchase request from JS for email: \(email)")
                
                // Start the StoreKit purchase flow asynchronously
                Task {
                    let success = await storeKitService.purchaseCoverLetter(email: email)
                    
                    if !success {
                        // If payment fails or is cancelled, send an error toast back to JS
                        await MainActor.run {
                            let script = "showToast('Payment failed or cancelled. Please try again.', 'error')"
                            self.storeKitService.webView?.evaluateJavaScript(script)
                        }
                    }
                }
            }
        }
    }
    
    // 🟢 WKNavigationDelegate (Fixes the "Service Not Available" Error) 🟢
    // This runs AFTER the webpage content is fully loaded and ready to talk to Swift.
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("Web content loaded. Unlocking JavaScript button.")
        
        // CRITICAL FIX: Send a JavaScript command to ENABLE the pay button only now
        // This ensures the button is not tapped before the message handler is ready.
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
    
    // Inject the ObservableObject (StoreKitService)
    @ObservedObject var storeKitService: StoreKitService 
    
    private let urlString = "https://quickcoverletter.onrender.com" 

    func makeUIView(context: Context) -> WKWebView {
        
        let contentController = WKUserContentController()
        
        // Add the Coordinator as a message handler for the name "purchase"
        contentController.add(context.coordinator, name: "purchase")
        
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        
        // Set the Coordinator as the navigation delegate
        webView.navigationDelegate = context.coordinator 
        
        // Store the webView reference for the success callback
        storeKitService.webView = webView 
        
        // Load the website
        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }
        
        return webView
    }
    
    // Required function, usually left empty
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No update needed
    }
    
    // Creates the instance of the Coordinator when the View is initialized
    func makeCoordinator() -> WebViewCoordinator {
        return WebViewCoordinator(storeKitService: storeKitService)
    }
}
