import SwiftUI
import WebKit

struct ContentView: View {
    
    @StateObject private var storeKitService = StoreKitService()

    var body: some View {
        ZStack(alignment: .bottom) {
            // The Website
            WebKitView(storeKitService: storeKitService)
                .edgesIgnoringSafeArea(.all)
            
            // 🟢 THE DEBUG BUTTON
            Button(action: {
                print("🟢 FORCE BUTTON TAPPED")
                Task {
                    // We fake an email just to test the connection
                    await storeKitService.purchase(email: "debug_test@gmail.com")
                }
            }) {
                Text("FORCE TEST PAYMENT")
                    .bold()
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.red)
                    .foregroundColor(.white)
            }
        }
        .onAppear {
            print("App view loaded. StoreKitService initialized.")
        }
    }
}
