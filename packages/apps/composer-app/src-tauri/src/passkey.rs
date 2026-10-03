//! Whether this build can complete a native passkey request.
//!
//! AuthenticationServices resolves the caller by its signed `com.apple.application-identifier`. When that
//! does not name this bundle, the system shows a sheet that never calls back and the plugin cannot cancel,
//! so such a build neither registers the plugin nor offers native passkeys to the page.

/// Page global holding availability; read by `NativePasskey.getPasskeySupport` in `@dxos/app-toolkit`.
const PAGE_GLOBAL: &str = "__DX_NATIVE_PASSKEYS__";

/// Whether a signed application identifier (`<team id>.<bundle id>`) names `bundle_identifier`.
pub fn signed_for(application_identifier: Option<&str>, bundle_identifier: &str) -> bool {
    application_identifier
        .and_then(|identifier| identifier.split_once('.'))
        .is_some_and(|(_team, bundle)| bundle == bundle_identifier)
}

/// Whether native passkey requests made by the running process can complete.
pub fn available(bundle_identifier: &str) -> bool {
    signed_for(entitlement::application_identifier().as_deref(), bundle_identifier)
}

/// Initialization script that publishes availability before any page script runs.
pub fn page_script(available: bool) -> String {
    format!("globalThis.{PAGE_GLOBAL} = {available};")
}

/// Publishes availability to every webview, so no window (the main one or the spotlight panel) can
/// offer a passkey the shell cannot complete.
pub fn init<R: tauri::Runtime>(available: bool) -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("dx-passkey-gate")
        .js_init_script(page_script(available))
        .build()
}

mod entitlement {
    use core_foundation::base::{CFType, CFTypeRef, TCFType};
    use core_foundation::string::{CFString, CFStringRef};

    #[link(name = "Security", kind = "framework")]
    extern "C" {
        fn SecTaskCreateFromSelf(allocator: CFTypeRef) -> CFTypeRef;
        fn SecTaskCopyValueForEntitlement(
            task: CFTypeRef,
            entitlement: CFStringRef,
            error: *mut CFTypeRef,
        ) -> CFTypeRef;
    }

    /// The application identifier this process was signed with; `None` when unsigned or absent.
    pub fn application_identifier() -> Option<String> {
        let key = CFString::from_static_string("com.apple.application-identifier");
        // SAFETY: both calls follow the Create/Copy rule, so each non-null result is owned once by the
        // `CFType` wrapping it; the API accepts a null allocator and a null error out-parameter.
        unsafe {
            let task = SecTaskCreateFromSelf(std::ptr::null());
            if task.is_null() {
                return None;
            }
            let task = CFType::wrap_under_create_rule(task);
            let value = SecTaskCopyValueForEntitlement(
                task.as_CFTypeRef(),
                key.as_concrete_TypeRef(),
                std::ptr::null_mut(),
            );
            if value.is_null() {
                return None;
            }
            CFType::wrap_under_create_rule(value)
                .downcast::<CFString>()
                .map(|identifier| identifier.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn production_signature_names_the_production_bundle() {
        assert!(signed_for(Some("9428WC5MR8.org.dxos.composer"), "org.dxos.composer"));
    }

    /// DX-1324: channel builds carry a suffixed bundle identifier but production's signed identity.
    #[test]
    fn production_signature_does_not_name_a_channel_bundle() {
        for bundle in ["org.dxos.composer.dev", "org.dxos.composer.preview", "org.dxos.composer.staging"] {
            assert!(!signed_for(Some("9428WC5MR8.org.dxos.composer"), bundle), "{bundle}");
        }
    }

    #[test]
    fn channel_signed_with_its_own_identity_is_available() {
        assert!(signed_for(Some("9428WC5MR8.org.dxos.composer.preview"), "org.dxos.composer.preview"));
    }

    #[test]
    fn unsigned_or_malformed_identity_is_unavailable() {
        for identifier in [None, Some(""), Some("org"), Some("9428WC5MR8")] {
            assert!(!signed_for(identifier, "org.dxos.composer"), "{identifier:?}");
        }
    }

    /// An unsigned test binary has no application identifier.
    #[test]
    fn unsigned_process_is_unavailable() {
        assert!(!available("org.dxos.composer"));
    }

    #[test]
    fn page_script_sets_a_boolean() {
        assert_eq!(page_script(true), "globalThis.__DX_NATIVE_PASSKEYS__ = true;");
        assert_eq!(page_script(false), "globalThis.__DX_NATIVE_PASSKEYS__ = false;");
    }
}
