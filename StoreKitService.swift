import StoreKit
import WebKit // We need WebKit to access the webView property later

// The exact Product ID you saved in App Store Connect
// (Must match: com.steveforde.quickcoverletter.one_letter_credit)
private let productID = "com.steveforde.quickcoverletter.one_letter_credit"

class StoreKitService: ObservableObject {
    
    // Published properties to potentially update the UI
    @Published var product: Product? // Holds the price and name fetched from Apple
    @Published var isPurchasing = false // Tracks if the transaction view is open
    
    // Reference to the WKWebView instance, set by the WebView View
    // This allows us to call JavaScript functions from Swift.
    var webView: WKWebView? 

    init() {
        // Start fetching product details as soon as the app launches
        Task {
            await self.requestProducts()
        }
    }
    
    // --- 1. Fetch Products from App Store ---
    func requestProducts() async {
        do {
            let fetchedProducts = try await Product.products(for: [productID])
            self.product = fetchedProducts.first
            if self.product == nil {
                print("Error: Product ID not found in App Store. Check App Store Connect setup.")
            }
        } catch {
            print("Error requesting products: \(error)")
        }
    }
    
    // --- 2. Initiate the Purchase ---
    // Accepts the user's email from JavaScript to use in the fulfillment step
    func purchaseCoverLetter(email: String) async -> Bool {
        guard let productToBuy = product else {
            print("Product details not loaded. Cannot start purchase.")
            return false
        }
        
        isPurchasing = true
        defer { isPurchasing = false } // Always reset the flag when function finishes
        
        do {
            let result = try await productToBuy.purchase()
            
            switch result {
            case .success(let verification):
                // If successful, handle fulfillment (delivery)
                return await self.handle(verification: verification, userEmail: email)
                
            case .pending:
                print("Purchase pending user action (e.g., parental approval).")
                return false
                
            case .userCancelled:
                print("Purchase cancelled by user.")
                return false
                
            @unknown default:
                return false
            }
        } catch {
            print("Purchase failed: \(error)")
            return false
        }
    }
    
    // --- 3. Verification and Fulfillment (CRITICAL for Consumables) ---
    private func handle(verification: VerificationResult<Transaction>, userEmail: String) async -> Bool {
        
        // 3a & 3b: Verification checks (No change needed here)
        guard case .verified(let transaction) = verification else { return false }
        guard transaction.productID == productID else { return false }
        
        // ** STEP 4: FULFILLMENT - The Fix for Guideline 3.1.1 **
        print("Payment verified! Transaction ID: \(transaction.id). Sending success signal to JS...")

        // 🟢 CRITICAL FIX: Tell the JavaScript frontend to unlock the feature
        // This executes window.handleIAPSuccess(email) in the WebView
        await MainActor.run {
            let script = "handleIAPSuccess('\(userEmail)')"
            self.webView?.evaluateJavaScript(script)
            print("Sent success callback to JavaScript: \(script)")
        }
        
        // ** STEP 5: Finish the Transaction **
        await transaction.finish()
        
        return true
    }