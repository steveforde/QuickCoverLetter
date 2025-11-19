import SwiftUI
import WebKit

struct WebKitView: UIViewRepresentable {
    @ObservedObject var storeKitService: StoreKitService
    
    func makeCoordinator() -> Coordinator {
        Coordinator(storeKitService)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "purchase")
        
        let config = WKWebViewConfiguration()
        config.userContentController = controller
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        storeKitService.webView = webView
        
        if let url = URL(string: "https://quickcoverletter.onrender.com") {
            webView.load(URLRequest(url: url))
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let service: StoreKitService
        
        init(_ service: StoreKitService) {
            self.service = service
        }
        
        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            if message.name == "purchase", let email = message.body as? String {
                print("IAP REQUESTED FOR: \(email)")
                Task { await service.purchase(email: email) }
            }
        }
        
        // THIS IS THE ONLY PART THAT WAS FAILING BEFORE
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("PAGE LOADED – FORCING PAY BUTTON ENABLE")
            
            let forceEnable = """
            (function() {
                const btn = document.getElementById('payButton');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '€1.99';
                    console.log('PAY BUTTON FORCE-ENABLED');
                }
                if (typeof enablePayButton === 'function') {
                    enablePayButton('€1.99');
                }
            })();
            """
            
            webView.evaluateJavaScript(forceEnable) { _, error in
                if let error = error {
                    print("JS ERROR: \(error)")
                } else {
                    print("PAY BUTTON IS NOW CLICKABLE")
                }
            }
        }
    }
}
