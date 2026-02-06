import UIKit
import WebKit

/// Simple keyboard observer that emits events to the webview.
/// Add this file to the Xcode project Sources.
class KeyboardObserver: NSObject {
    private weak var webview: WKWebView?
    
    init(webview: WKWebView) {
        self.webview = webview
        super.init()
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
        
        print("🎹 KeyboardObserver initialized")
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func keyboardWillShow(notification: NSNotification) {
        guard let userInfo = notification.userInfo,
              let keyboardFrame = userInfo[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect,
              let duration = userInfo[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double else {
            return
        }
        
        let height = keyboardFrame.height
        print("🎹 Keyboard will show: height=\(height)")
        
        let js = "window.dispatchEvent(new CustomEvent('keyboard', { detail: { type: 'show', height: \(height), duration: \(duration) } }))"
        webview?.evaluateJavaScript(js, completionHandler: nil)
    }
    
    @objc private func keyboardWillHide(notification: NSNotification) {
        guard let userInfo = notification.userInfo,
              let duration = userInfo[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double else {
            return
        }
        
        print("🎹 Keyboard will hide")
        
        let js = "window.dispatchEvent(new CustomEvent('keyboard', { detail: { type: 'hide', height: 0, duration: \(duration) } }))"
        webview?.evaluateJavaScript(js, completionHandler: nil)
    }
}
