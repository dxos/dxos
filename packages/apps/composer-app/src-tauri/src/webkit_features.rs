//! WebKitGTK web features Composer needs that the Linux webview ships switched off.
//!
//! The client keeps its database in the origin-private file system, reached through `navigator.storage`;
//! WebKitGTK compiles both the Storage API and the File System API in but leaves them disabled by default,
//! so the client fails to open (`navigator.storage` is undefined). They are runtime features, switched on per
//! webview through `WebKitSettings` — an API newer (2.42) than the `webkit2gtk` crate's bindings, hence FFI.

use std::ffi::{c_char, c_void, CStr};

use glib::translate::ToGlibPtr;
use webkit2gtk::WebViewExt;

/// Identifiers from `MiniBrowser --features=help`.
const FEATURES: &[&str] = &["StorageAPI", "StorageAPIEstimate", "FileSystem", "FileSystemWritableStream", "AccessHandle"];

extern "C" {
    fn webkit_settings_get_all_features() -> *mut c_void;
    fn webkit_feature_list_get_length(list: *mut c_void) -> usize;
    fn webkit_feature_list_get(list: *mut c_void, index: usize) -> *mut c_void;
    fn webkit_feature_list_unref(list: *mut c_void);
    fn webkit_feature_get_identifier(feature: *mut c_void) -> *const c_char;
    fn webkit_settings_set_feature_enabled(settings: *mut c_void, feature: *mut c_void, enabled: glib::ffi::gboolean);
}

/// Enables [`FEATURES`] on `webview`; a feature this WebKitGTK does not know is logged and skipped.
pub fn enable(webview: &webkit2gtk::WebView) {
    let Some(settings) = webview.settings() else {
        log::warn!("webview has no settings; storage features stay off");
        return;
    };
    let settings: *mut webkit2gtk::ffi::WebKitSettings = settings.to_glib_none().0;
    let mut missing: Vec<&str> = FEATURES.to_vec();
    // SAFETY: the list is owned here (transfer full) and unreferenced once; features are borrowed from it,
    // and identifiers are static strings owned by WebKit.
    unsafe {
        let list = webkit_settings_get_all_features();
        for index in 0..webkit_feature_list_get_length(list) {
            let feature = webkit_feature_list_get(list, index);
            let identifier = CStr::from_ptr(webkit_feature_get_identifier(feature)).to_string_lossy();
            if let Some(position) = missing.iter().position(|name| *name == identifier) {
                webkit_settings_set_feature_enabled(settings.cast(), feature, glib::ffi::GTRUE);
                missing.remove(position);
            }
        }
        webkit_feature_list_unref(list);
    }
    if !missing.is_empty() {
        log::warn!("WebKitGTK does not know features {missing:?}; storage may not open");
    }
}
