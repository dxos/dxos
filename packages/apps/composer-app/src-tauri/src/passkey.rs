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

mod entitlement {
    use std::ffi::{c_char, c_void, CStr};

    type CFTypeRef = *const c_void;

    const APPLICATION_IDENTIFIER: &CStr = c"com.apple.application-identifier";
    const UTF8: u32 = 0x0800_0100;

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFGetTypeID(cf: CFTypeRef) -> usize;
        fn CFRelease(cf: CFTypeRef);
        fn CFStringCreateWithCString(allocator: CFTypeRef, c_str: *const c_char, encoding: u32) -> CFTypeRef;
        fn CFStringGetCString(string: CFTypeRef, buffer: *mut c_char, size: isize, encoding: u32) -> u8;
        fn CFStringGetTypeID() -> usize;
    }

    #[link(name = "Security", kind = "framework")]
    extern "C" {
        fn SecTaskCopyValueForEntitlement(task: CFTypeRef, entitlement: CFTypeRef, error: *mut CFTypeRef) -> CFTypeRef;
        fn SecTaskCreateFromSelf(allocator: CFTypeRef) -> CFTypeRef;
    }

    /// A +1 Core Foundation reference, released on drop.
    struct Owned(CFTypeRef);

    impl Owned {
        fn new(reference: CFTypeRef) -> Option<Self> {
            // `then`, not `then_some`: an eagerly built `Owned` would release null on drop.
            (!reference.is_null()).then(|| Self(reference))
        }
    }

    impl Drop for Owned {
        fn drop(&mut self) {
            // SAFETY: `Owned` only holds non-null references returned by a Create or Copy function.
            unsafe { CFRelease(self.0) }
        }
    }

    /// The application identifier this process was signed with; `None` when unsigned or absent.
    pub fn application_identifier() -> Option<String> {
        // SAFETY: arguments are live CF references or null where the API accepts null, and the value is
        // checked to be a CFString before it is read as one.
        unsafe {
            let task = Owned::new(SecTaskCreateFromSelf(std::ptr::null()))?;
            let key = Owned::new(CFStringCreateWithCString(std::ptr::null(), APPLICATION_IDENTIFIER.as_ptr(), UTF8))?;
            let value = Owned::new(SecTaskCopyValueForEntitlement(task.0, key.0, std::ptr::null_mut()))?;
            if CFGetTypeID(value.0) != CFStringGetTypeID() {
                return None;
            }

            let mut buffer = [0 as c_char; 256];
            if CFStringGetCString(value.0, buffer.as_mut_ptr(), buffer.len() as isize, UTF8) == 0 {
                return None;
            }
            CStr::from_ptr(buffer.as_ptr()).to_str().ok().map(str::to_owned)
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
