import StoreKit
import WebKit

private let productID = "com.steveforde.quickcoverletter.one_letter_credit"

class StoreKitService: ObservableObject {
    
    @Published var product: Product?
    @Published var isPurchasing = false
    
    var webView: WKWebView?
    
    init() {
        Task {
            await loadProduct()
        }
    }
    
    func loadProduct() async {
        print("Fetching IAP product...")
        do {
            let products = try await Product.products(for: [productID])
            if let p = products.first {
                await MainActor.run { self.product = p }
                print("PRODUCT READY: \(p.displayName) – \(p.displayPrice)")
            } else {
                print("PRODUCT NOT FOUND — check App Store Connect")
            }
        } catch {
            print("PRODUCT FETCH ERROR: \(error)")
        }
    }
    
    // ← THIS IS THE FUNCTION YOUR JS CALLS
    func purchase(email: String) async {
        guard let product = product else {
            print("NO PRODUCT LOADED YET")
            await callJS("showToast('Product not ready yet', 'error')")
            return
        }
        
        print("STARTING PURCHASE FOR: \(email)")
        isPurchasing = true
        
        do {
            let result = try await product.purchase()
            
            switch result {
            case .success(let verification):
                if case .verified(let transaction) = verification {
                    print("PAYMENT SUCCESSFUL")
                    await callJS("handleIAPSuccess('\(email)')")
                    await transaction.finish()
                } else {
                    await callJS("showToast('Payment not verified', 'error')")
                }
                
            case .userCancelled:
                print("USER CANCELLED")
            case .pending:
                print("PENDING")
            @unknown default:
                break
            }
        } catch {
            print("PURCHASE FAILED: \(error)")
            await callJS("showToast('Payment failed', 'error')")
        }
        
        isPurchasing = false
    }
    
    private func callJS(_ javascript: String) async {
        await MainActor.run {
            webView?.evaluateJavaScript(javascript) { _, error in
                if let error = error {
                    print("JS ERROR: \(error)")
                }
            }
        }
    }
    