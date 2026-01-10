//! macOS-specific spotlight implementation.
//!
//! Provides macOS-specific optimizations including:
//! - Rounded window corners via NSWindow configuration
//! - Window appears on current desktop/space (Mission Control spaces)
//! - NSWorkspace integration for app focus management
//! - Window level configuration

use objc2::rc::Retained;
use objc2::runtime::Bool;
use objc2_app_kit::{NSView, NSWindow, NSWindowStyleMask};
use tauri::WebviewWindow;

use super::SpotlightPlatform;

/// macOS platform implementation.
pub struct MacOSPlatform;

impl MacOSPlatform {
    /// Create a new macOS platform instance.
    pub fn new() -> Self {
        Self
    }
}

impl SpotlightPlatform for MacOSPlatform {
    fn configure_window(&self, window: &WebviewWindow) {
        // Configure rounded corners for frameless windows on macOS.
        // Based on tauri-plugin-mac-rounded-corners implementation.
        // Uses only public macOS APIs - App Store compatible.
        let _ = window.with_webview(|webview| {
            unsafe {
                    // Get the NSWindow from the webview.
                    let ns_window_ptr = webview.ns_window();
                    if ns_window_ptr.is_null() {
                        return;
                    }

                    let ns_window: Retained<NSWindow> = match Retained::from_raw(ns_window_ptr as *mut NSWindow) {
                        Some(window) => window,
                        None => return,
                    };

                    // Configure window style for rounded corners.
                    // We need the Titled mask for rounded corners to work, but we'll hide the traffic lights.
                    let mut style_mask = ns_window.styleMask();
                    style_mask.insert(NSWindowStyleMask::FullSizeContentView);
                    style_mask.insert(NSWindowStyleMask::Titled);
                    ns_window.setStyleMask(style_mask);
                    ns_window.setTitlebarAppearsTransparent(true);
                    ns_window.setTitleVisibility(objc2_app_kit::NSWindowTitleVisibility::Hidden);

                    // Hide traffic lights by making them invisible.
                    // Standard window buttons: 0=close, 1=minimize, 2=zoom
                    use objc2::msg_send;
                    let ns_window_ptr = Retained::as_ptr(&ns_window) as *mut NSWindow;
                    let close_btn: *mut objc2::runtime::AnyObject = msg_send![ns_window_ptr, standardWindowButton: 0];
                    let mini_btn: *mut objc2::runtime::AnyObject = msg_send![ns_window_ptr, standardWindowButton: 1];
                    let zoom_btn: *mut objc2::runtime::AnyObject = msg_send![ns_window_ptr, standardWindowButton: 2];
                    
                    if !close_btn.is_null() {
                        let _: () = msg_send![close_btn, setHidden: Bool::YES];
                    }
                    if !mini_btn.is_null() {
                        let _: () = msg_send![mini_btn, setHidden: Bool::YES];
                    }
                    if !zoom_btn.is_null() {
                        let _: () = msg_send![zoom_btn, setHidden: Bool::YES];
                    }

                    // Enable shadow for better visual appearance.
                    ns_window.setHasShadow(true);

                    // Get content view and enable layer-backed rendering.
                    let content_view: Retained<NSView> = match ns_window.contentView() {
                        Some(view) => view,
                        None => return,
                    };
                    content_view.setWantsLayer(true);

                    // Set corner radius on the layer.
                    if let Some(layer) = content_view.layer() {
                        // layer is a Retained<CALayer>, get the raw pointer
                        use objc2::msg_send;
                        use objc2_quartz_core::CALayer;
                        let layer_ptr = Retained::as_ptr(&layer) as *mut CALayer;
                        let _: () = msg_send![layer_ptr, setCornerRadius: 12.0];
                        let _: () = msg_send![layer_ptr, setMasksToBounds: Bool::YES];
                    }

                    // Configure window to appear on the current desktop/space.
                    // NSWindowCollectionBehaviorMoveToActiveSpace = 1 << 1
                    // This ensures the window moves to the active space when shown.
                    let ns_window_ptr = Retained::as_ptr(&ns_window) as *mut NSWindow;
                    let current_behavior: usize = msg_send![ns_window_ptr, collectionBehavior];
                    let move_to_active_space: usize = 1 << 1; // NSWindowCollectionBehaviorMoveToActiveSpace
                    let new_behavior = current_behavior | move_to_active_space;
                    let _: () = msg_send![ns_window_ptr, setCollectionBehavior: new_behavior];
                }
            });
    }

    fn show(&self, window: &WebviewWindow) {
        // TODO: Show window without activating the application (Raycast-like behavior).
        //   Currently, showing the window activates the app and changes the menu bar.
        let _ = window.show();
        let _ = window.set_focus();
    }

    fn store_previous_app(&self) {
        // TODO: Implement app focus restoration.
        // This would require detecting the frontmost application before showing spotlight
        // and restoring it on hide. The objc2-app-kit API for this needs to be determined.
    }

    fn restore_previous_app(&self) {
        // TODO: Implement app focus restoration.
        // See store_previous_app() for details.
    }
}
