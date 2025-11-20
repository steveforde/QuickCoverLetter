import Foundation
import StoreKit
import WebKit

// 🟢 DOUBLE CHECK: This ID must match your Config1.storekit file EXACTLY
private let productID = "com.steveforde.quickcoverletter.one_letter_credit"

class StoreKitService: ObservableObject {
    
    @Published var product: Product?
    @Published var isPurchasing = false
    
    var webView: WKWebView?
    
    init() {
        print("🚀 STOREKIT SERVICE STARTED")
        Task {
            await loadProduct()
        }
    }
    
    func loadProduct() async {
        print("🔎 LOOKING FOR PRODUCT ID: \(productID)")
        do {
            // Request the product from Apple (or the Config file)
            let products = try await Product.products(for: [productID])
            
            if let p = products.first {
                // SUCCESS: We found it
                await MainActor.run { self.product = p }
                print("✅ PRODUCT FOUND: \(p.displayName) - \(p.displayPrice)")
            } else {
                // FAILURE: The list is empty
                print("⛔️ ERROR: Product list is EMPTY. Check your Scheme settings!")
            }
        } catch {
            print("❌ CRITICAL ERROR: Failed to load product. \(error)")
        }
    }
    
    func purchase(email: String) async {
        print("💰 PURCHASE REQUESTED FOR: \(email)")
        
        // 1. Check if we have the product loaded
        guard let product = product else {
            print("💀 FATAL: Cannot buy because 'product' is missing.")
            print("👉 TIP: Did you select 'Config1.storekit' in Edit Scheme?")
            return
        }
        
        await MainActor.run { isPurchasing = true }
        
        do {
            // 2. Attempt the purchase
            let result = try await product.purchase()
            
            switch result {
            case .success(let verification):
                print("🎉 PURCHASE SUCCESSFUL!")
                // Verify the transaction
                let transaction = try checkVerified(verification)
                
                // Tell the website we won
                await callJS("handleIAPSuccess('\(email)')")
                
                // Finish the transaction
                await transaction.finish()
                
            case .userCancelled:
                print("⚠️ User cancelled the pop-up.")
            case .pending:
                print("⏳ Purchase is pending approval.")
            @unknown default:
                break
            }
        } catch {
            print("❌ PURCHASE FAILED: \(error)")
        }
        
        await MainActor.run { isPurchasing = false }
    }
    
    // Helper to verify the receipt
    func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw URLError(.badServerResponse)
        case .verified(let safe):
            return safe
        }
    }
    
    // Helper to talk to the website
    private func callJS(_ javascript: String) async {
        await MainActor.run {
            webView?.evaluateJavaScript(javascript) { _, error in
                if let error = error {
                    print("JS ERROR: \(error)")
                }
            }
        }
    }
}
