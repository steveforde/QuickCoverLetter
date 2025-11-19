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
        
        // ← THIS WAS MISSING A ) ←
        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            if message.name == "purchase", let email = message.body as? String {
                print("JS → Swift: purchase requested for \(email)")
                Task {
                    await service.purchase(email: email)
                }
            }
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("WEB PAGE FULLY LOADED — NOW ENABLING PAY BUTTON")
            
            let js = """
            if (typeof enablePayButton === 'function') {
                enablePayButton('€1.99');
            } else {
                console.log('enablePayButton not found yet');
            }
            """
            
            webView.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("JS ERROR: \(error)")
                } else {
                    print("enablePayButton CALLED SUCCESSFULLY")
                }
            }
        }
    }
}
