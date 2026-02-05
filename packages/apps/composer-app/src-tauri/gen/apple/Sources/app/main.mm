#include "bindings/bindings.h"
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <objc/runtime.h>

// Recursively find WKWebView in the view hierarchy
static WKWebView* findWebView(UIView* view) {
    if ([view isKindOfClass:[WKWebView class]]) {
        return (WKWebView*)view;
    }
    for (UIView* subview in view.subviews) {
        WKWebView* found = findWebView(subview);
        if (found) return found;
    }
    return nil;
}

// Recursively find the root UIViewController
static UIViewController* findRootViewController(UIWindow* window) {
    UIViewController* vc = window.rootViewController;
    while (vc.presentedViewController) {
        vc = vc.presentedViewController;
    }
    return vc;
}

static int fixAttempts = 0;

// Fix WKWebView to enable edge-to-edge content
static void fixWebViewLayout(void) {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        UIWindow* window = nil;
        
        for (UIScene* scene in [UIApplication sharedApplication].connectedScenes) {
            if ([scene isKindOfClass:[UIWindowScene class]]) {
                UIWindowScene* windowScene = (UIWindowScene*)scene;
                for (UIWindow* w in windowScene.windows) {
                    if (w.isKeyWindow) {
                        window = w;
                        break;
                    }
                }
            }
        }
        
        if (!window) {
            window = [[UIApplication sharedApplication] keyWindow];
        }
        
        if (window) {
            WKWebView* webView = findWebView(window);
            if (webView) {
                // Disable content inset adjustments
                webView.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
                
                // Remove all constraints on the webview and its superview
                [webView removeConstraints:webView.constraints];
                
                // Disable autoresizing mask translation to prevent conflicts
                webView.translatesAutoresizingMaskIntoConstraints = YES;
                
                // Set webview frame to full window bounds
                webView.frame = window.bounds;
                
                // Also set the superview to full bounds if it exists
                if (webView.superview) {
                    webView.superview.frame = window.bounds;
                    [webView.superview removeConstraints:webView.superview.constraints];
                }
                
                // Try to extend layout under bars
                UIViewController* vc = findRootViewController(window);
                if (vc) {
                    vc.edgesForExtendedLayout = UIRectEdgeAll;
                    vc.extendedLayoutIncludesOpaqueBars = YES;
                }
                
                // Force layout update
                [webView setNeedsLayout];
                [webView layoutIfNeeded];
                [window setNeedsLayout];
                [window layoutIfNeeded];
                
                NSLog(@"[Composer] Fixed WKWebView layout - frame: %@", NSStringFromCGRect(webView.frame));
            } else {
                fixAttempts++;
                if (fixAttempts < 10) {
                    NSLog(@"[Composer] WKWebView not found, attempt %d, retrying...", fixAttempts);
                    fixWebViewLayout();
                } else {
                    NSLog(@"[Composer] WKWebView not found after 10 attempts");
                }
            }
        }
    });
}

int main(int argc, char * argv[]) {
    // Schedule the webview fix to run after the app starts
    fixWebViewLayout();
    
    ffi::start_app();
    return 0;
}
