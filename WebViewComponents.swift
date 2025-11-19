import SwiftUI
import WebKit
import Foundation

// NOTE: This file assumes your StoreKitService class is defined and accessible.

// ===================================================
// 1. WebViewCoordinator (The JavaScript Listener)
// ===================================================
class WebViewCoordinator: NSObject, WKScriptMessageHandler {
    
    // Reference to your StoreKit service to initiate the IAP
    var storeKitService: StoreKitService
    
    init(storeKitService: StoreKitService) {
        self.storeKitService = storeKitService
    }
    
    // This method is called when JavaScript sends a message via 'webkit.messageHandlers'
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        
        // Check if the message name is the one we expect from script.js ("purchase")
        if message.name == "purchase" {
            
            // The body contains the user's email address (String)
            if let email = message.body as? String {
                print("Received purchase request from JS for email: \(email)")
                
                // Start the StoreKit purchase flow asynchronously
                Task {
                    // The purchaseCoverLetter function handles the IAP logic
                    let success = await storeKitService.purchaseCoverLetter(email: email)
                    
                    if !success {
                        // If payment fails or is cancelled, send an error toast back to JS
                        await MainActor.run {
                            let script = "showToast('Payment failed or cancelled. Please try again.', 'error')"
                            self.storeKitService.webView?.evaluateJavaScript(script)
                        }
                    }
                    // If successful, the StoreKitService handles the JS callback (handleIAPSuccess) internally.
                }
            }
        }
    }
}


// ===================================================
// 2. WebKitView (The SwiftUI View)
// ===================================================
struct WebKitView: UIViewRepresentable {
    
    // Inject the ObservableObject (StoreKitService) to share data and methods
    @ObservedObject var storeKitService: StoreKitService 
    
    // The hosted URL for your frontend
    private let urlString = "https://quickcoverletter.onrender.com" 

    func makeUIView(context: Context) -> WKWebView {
        
        let contentController = WKUserContentController()
        
        // CRITICAL STEP: Add the Coordinator as a message handler for the name "purchase"
        // This creates the link: window.webkit.messageHandlers.purchase
        contentController.add(context.coordinator, name: "purchase")
        
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        
        // Store the webView reference in the service. This allows the StoreKitService 
        // (after a successful IAP) to send messages back to the JavaScript frontend.
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
        // Pass the StoreKitService to the coordinator so it can access the payment logic
        return WebViewCoordinator(storeKitService: storeKitService)
    }
}
