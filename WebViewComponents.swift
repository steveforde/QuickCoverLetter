import SwiftUI
import WebKit

struct WebKitView: UIViewRepresentable {
    // We pass the ObservableObject (StoreKitService) here
    @ObservedObject var storeKitService: StoreKitService 
    
    // The URL of your hosted frontend
    private let urlString = "https://quickcoverletter.onrender.com" 

    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()
        
        // 5. Add the Coordinator as a message handler for the name "purchase"
        contentController.add(context.coordinator, name: "purchase")
        
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        
        // 6. Store the webView reference in the service for JavaScript callbacks
        storeKitService.webView = webView 
        
        // Load the website
        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Required for UIViewRepresentable
    }
    
    // 7. Create the coordinator instance
    func makeCoordinator() -> WebViewCoordinator {
        // Pass the StoreKitService to the coordinator so it can access the purchase function
        return WebViewCoordinator(storeKitService: storeKitService)
    }
}
