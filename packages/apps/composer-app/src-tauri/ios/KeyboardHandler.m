//
//  KeyboardHandler.m
//  Pure Objective-C keyboard handler - no Swift dependency.
//  Uses +load to auto-initialize and observe keyboard events.
//

#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import <objc/runtime.h>

static WKWebView *_webView = nil;
static BOOL _initialized = NO;

@interface KeyboardHandler : NSObject
@end

@implementation KeyboardHandler

+ (void)load {
    NSLog(@"[KeyboardHandler] +load");
    
    // Disable Input Accessory View immediately.
    [self disableInputAccessoryView];
    
    // Watch for app to become active to find the webview.
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(appDidBecomeActive:)
                                                 name:UIApplicationDidBecomeActiveNotification
                                               object:nil];
}

+ (void)appDidBecomeActive:(NSNotification *)notification {
    if (_initialized) return;
    
    NSLog(@"[KeyboardHandler] appDidBecomeActive");
    
    // Delay slightly to let the webview initialize.
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        [self findAndSetupWebView];
    });
}

+ (void)findAndSetupWebView {
    UIWindow *keyWindow = nil;
    
    for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
        if ([scene isKindOfClass:[UIWindowScene class]]) {
            UIWindowScene *windowScene = (UIWindowScene *)scene;
            for (UIWindow *window in windowScene.windows) {
                if (window.isKeyWindow) {
                    keyWindow = window;
                    break;
                }
            }
        }
        if (keyWindow) break;
    }
    
    if (!keyWindow) {
        NSLog(@"[KeyboardHandler] No key window found, retrying...");
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self findAndSetupWebView];
        });
        return;
    }
    
    WKWebView *webView = [self findWKWebViewInView:keyWindow];
    if (!webView) {
        NSLog(@"[KeyboardHandler] WKWebView not found, retrying...");
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self findAndSetupWebView];
        });
        return;
    }
    
    _webView = webView;
    _initialized = YES;
    NSLog(@"[KeyboardHandler] WKWebView found, setting up keyboard observers");
    
    // Register for keyboard notifications.
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(keyboardWillShow:)
                                                 name:UIKeyboardWillShowNotification
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(keyboardWillHide:)
                                                 name:UIKeyboardWillHideNotification
                                               object:nil];
    
    NSLog(@"[KeyboardHandler] initialized");
}

+ (WKWebView *)findWKWebViewInView:(UIView *)view {
    if ([view isKindOfClass:[WKWebView class]]) {
        return (WKWebView *)view;
    }
    for (UIView *subview in view.subviews) {
        WKWebView *found = [self findWKWebViewInView:subview];
        if (found) return found;
    }
    return nil;
}

+ (void)keyboardWillShow:(NSNotification *)notification {
    NSDictionary *userInfo = notification.userInfo;
    CGRect keyboardFrame = [userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
    NSNumber *duration = userInfo[UIKeyboardAnimationDurationUserInfoKey];
    
    CGFloat height = keyboardFrame.size.height;
    NSLog(@"[KeyboardHandler] Keyboard will show: height=%f", height);
    
    NSString *js = [NSString stringWithFormat:
        @"window.dispatchEvent(new CustomEvent('keyboard', { detail: { type: 'show', height: %f, duration: %f } }))",
        height, duration.doubleValue];
    
    [_webView evaluateJavaScript:js completionHandler:nil];
}

+ (void)keyboardWillHide:(NSNotification *)notification {
    NSDictionary *userInfo = notification.userInfo;
    NSNumber *duration = userInfo[UIKeyboardAnimationDurationUserInfoKey];
    
    NSLog(@"[KeyboardHandler] Keyboard will hide");
    
    NSString *js = [NSString stringWithFormat:
        @"window.dispatchEvent(new CustomEvent('keyboard', { detail: { type: 'hide', height: 0, duration: %f } }))",
        duration.doubleValue];
    
    [_webView evaluateJavaScript:js completionHandler:nil];
}

+ (void)disableInputAccessoryView {
    Class wkContentViewClass = NSClassFromString(@"WKContentView");
    if (!wkContentViewClass) {
        NSLog(@"[KeyboardHandler] Could not find WKContentView class");
        return;
    }
    
    SEL originalSelector = @selector(inputAccessoryView);
    
    // Create a method that returns nil.
    IMP nilImp = imp_implementationWithBlock(^UIView *(id _self) {
        return nil;
    });
    
    Method method = class_getInstanceMethod(wkContentViewClass, originalSelector);
    if (method) {
        method_setImplementation(method, nilImp);
        NSLog(@"[KeyboardHandler] Input Accessory View disabled");
    }
}

@end
