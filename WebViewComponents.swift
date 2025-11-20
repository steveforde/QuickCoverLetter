import SwiftUI
import WebKit
import Foundation

// ===================================================
// 1. Coordinator (The Listener & Delegate)
// ===================================================
class WebViewCoordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate { 
    
    // Reference to the payment service
    var storeKitService: StoreKitService 
    
    init(storeKitService: StoreKitService) {
        self.storeKitService = storeKitService
    }
    
    // Handle messages from JavaScript
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "purchase", let email = message.body as? String {
            print("JS → Swift: purchase requested for \(email)")
            Task {
                // 🟢 FIXED: Changed 'service' to 'storeKitService' so it actually works
                await storeKitService.purchase(email: email) 
            }
        }
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    print("Web content loaded. Forcing App Mode.")
    
    // 1. Force the website to know it's in an app (Standard flags)
    let forceAppMode = """
        window.isIOSApp = true; 
        window.isInApp = true;
        window.webkit.messageHandlers.purchase.postMessage("ready");
    """
    webView.evaluateJavaScript(forceAppMode)
    
    // 2. Enable the button manually
    let enableScript = """
        var btn = document.getElementById('payButton');
        if (btn) {
            btn.disabled = false; 
            btn.textContent = 'Pay €1.99 to Unlock a letter';
            // Remove old listeners to stop the red error
            var newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Add OUR click listener
            newBtn.addEventListener('click', function() {
                var emailInput = document.getElementById('email'); 
                var email = emailInput ? emailInput.value : 'unknown';
                window.webkit.messageHandlers.purchase.postMessage(email);
            });
        }
    """
    webView.evaluateJavaScript(enableScript)
}


// ===================================================
// 2. WebKitView (The SwiftUI View)
// REPLACEMENT CODE - Paste this over the old struct
// ===================================================
struct WebKitView: UIViewRepresentable {
    
    @ObservedObject var storeKitService: StoreKitService 
    private let urlString = "https://quickcoverletter.onrender.com" 

    func makeUIView(context: Context) -> WKWebView {
        
        let contentController = WKUserContentController()
        
        // 1. Add the Listener for purchase messages
        contentController.add(context.coordinator, name: "purchase")
        
        // 🟢 NEW FIX: Inject "App Mode" flags BEFORE the website loads
        // This runs at "Document Start" to beat the website's checks
        let source = """
            window.isIOSApp = true;
            window.isInApp = true;
            window.isNativeApp = true;
        """
        let script = WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        contentController.addUserScript(script)
        
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        
        // 2. Set the User Agent (Backup ID card)
        webView.customUserAgent = "QuickCoverLetter_iOS_App"
        
        // Set both delegates to the Coordinator
        webView.navigationDelegate = context.coordinator 
        
        // Store the webView reference
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
        return WebViewCoordinator(storeKitService: storeKitService)
    }
}
