import UIKit
import WebKit

class ViewController: UIViewController {

    var webView: WKWebView!
    var logoImageView: UIImageView!
    var taglineLabel: UILabel!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Brand blue background
        view.backgroundColor = UIColor(red: 0.0, green: 0.44, blue: 1.0, alpha: 1.0)

        // Configure WebView (hidden at first)
        webView = WKWebView(frame: view.bounds)
        webView.alpha = 0
        view.addSubview(webView)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        // Logo image (centered)
        let logoImage = UIImage(named: "icon")
        logoImageView = UIImageView(image: logoImage)
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(logoImageView)

        // Tagline label (bottom)
        taglineLabel = UILabel()
        taglineLabel.text = "Powered by QuickCoverLetter"
        taglineLabel.font = UIFont.systemFont(ofSize: 15, weight: .medium)
        taglineLabel.textColor = .white
        taglineLabel.alpha = 0
        taglineLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(taglineLabel)

        // Layout constraints
        NSLayoutConstraint.activate([
            logoImageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            logoImageView.widthAnchor.constraint(equalToConstant: 180),
            logoImageView.heightAnchor.constraint(equalToConstant: 180),

            taglineLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            taglineLabel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -30)
        ])

        // Load your website
        if let url = URL(string: "https://quickcoverletter.onrender.com/") {
            let request = URLRequest(url: url)
            webView.load(request)
        } else {
            print("❌ Invalid URL")
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        // Step 1: Fade in logo first
        logoImageView.alpha = 0
        taglineLabel.alpha = 0

        UIView.animate(withDuration: 1.0, delay: 0.0, options: .curveEaseInOut, animations: {
            self.logoImageView.alpha = 1
        })

        // Step 2: Tagline fades in slightly after (0.3-second delay)
        UIView.animate(withDuration: 1.0, delay: 0.3, options: .curveEaseInOut, animations: {
            self.taglineLabel.alpha = 1
        }) { _ in
            // Step 3: Hold for a moment, then fade both out and reveal web view
            UIView.animate(withDuration: 1.0, delay: 1.0, options: .curveEaseInOut, animations: {
                self.logoImageView.alpha = 0
                self.taglineLabel.alpha = 0
                self.webView.alpha = 1
            }, completion: { _ in
                self.logoImageView.removeFromSuperview()
                self.taglineLabel.removeFromSuperview()
            })
        }
    }
}
