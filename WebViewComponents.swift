import SwiftUI
import WebKit
import Foundation

// ===================================================
// 1. Coordinator (The Listener & Delegate)
// ===================================================
class WebViewCoordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate { 
    
    var storeKitService: StoreKitService 
    
    init(storeKitService: StoreKitService) {
        self.storeKitService = storeKitService
    }
    
    // 1. Listen for the message from the button
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        print("📢 HIT! Message received: \(message.body)")
        
        if message.name == "purchase", let email = message.body as? String {
            print("✅ Starting Purchase for: \(email)")
            Task {
                await storeKitService.purchase(email: email)
            }
        }
    }
    
    // 2. When the page finishes loading, HIJACK the button
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("⚡️ Page Loaded. Rewiring the Pay Button now...")
        
        let hackScript = """
            // Find the button
            var btn = document.getElementById('payButton');
            
            if (btn) {
                // 1. Enable it visually so you see it changed
                btn.disabled = false;
                btn.textContent = 'Pay €1.99 (App Active)';
                
                // 2. CLONE it to delete the old website 'Error' logic
                var newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // 3. Add OUR logic
                newBtn.addEventListener('click', function() {
                    // Grab the email from the correct input ID
                    var emailField = document.getElementById('userEmail');
                    var email = emailField ? emailField.value : 'Unknown';
                    
                    // Send to Swift
                    window.webkit.messageHandlers.purchase.postMessage(email);
                });
            } else {
                console.log("Could not find payButton to hijack.");
            }
        """
        
        webView.evaluateJavaScript(hackScript) { (result, error) in
            if let error = error {
                print("❌ JS Injection Failed: \(error)")
            } else {
                print("✅ Button Successfully Rewired.")
            }
        }
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
        
        // 1. Add the Listener for purchase messages
        contentController.add(context.coordinator, name: "purchase")
        
        // Inject "App Mode" flags just in case
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
        
        // 2. Set the User Agent
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
