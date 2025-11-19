import SwiftUI
// 🟢 CRITICAL ADDITION: Needed because StoreKitService uses WKWebView types
import WebKit 

struct ContentView: View {
    
    @StateObject private var storeKitService = StoreKitService()

    var body: some View {
        VStack {
            // WebKitView is defined elsewhere but used here
            WebKitView(storeKitService: storeKitService) 
                .edgesIgnoringSafeArea(.all) 
        }
        .onAppear {
            print("App view loaded. StoreKitService initialized.")
        }
    }
}
