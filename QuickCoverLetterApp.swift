import SwiftUI
// 🟢 CRITICAL ADDITION: Needed because ContentView relies on StoreKitService/WKWebView types
import WebKit 

@main
struct QuickCoverLetterApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView() 
        }
    }
}
