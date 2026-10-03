//! The commands take the same arguments and return the same shapes as `tauri-plugin-macos-passkey`, so
//! `NativePasskey` in `@dxos/app-toolkit` decodes both alike.

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

const AUTHORIZATION_ERROR_DOMAIN: &str = "com.apple.AuthenticationServices.AuthorizationError";

const AUTHORIZATION_CANCELED: i64 = 1001;

const BRIDGE_ERROR_DOMAIN: &str = "org.dxos.composer.passkey";

const BRIDGE_SUPERSEDED: i64 = 1;

const ERROR_NAME: &str = "NativePasskeyError";

#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub struct RegistrationResult {
    pub id: String,
    pub raw_id: String,
    pub client_data_json: String,
    pub attestation_object: String,
    pub prf_output: Vec<u8>,
}

#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub struct LoginResult {
    pub id: String,
    pub raw_id: String,
    pub client_data_json: String,
    pub authenticator_data: String,
    pub signature: String,
    pub user_handle: String,
    pub prf_output: Vec<u8>,
}

#[derive(Debug, Deserialize)]
struct NativeError {
    domain: String,
    code: i64,
    message: String,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PasskeyError {
    name: &'static str,
    cancelled: bool,
    domain: String,
    code: Option<i64>,
    message: String,
}

impl PasskeyError {
    fn bridge(message: impl Into<String>) -> Self {
        Self {
            name: ERROR_NAME,
            cancelled: false,
            domain: BRIDGE_ERROR_DOMAIN.to_owned(),
            code: None,
            message: message.into(),
        }
    }
}

impl From<NativeError> for PasskeyError {
    fn from(error: NativeError) -> Self {
        let cancelled = matches!(
            (error.domain.as_str(), error.code),
            (AUTHORIZATION_ERROR_DOMAIN, AUTHORIZATION_CANCELED)
                | (BRIDGE_ERROR_DOMAIN, BRIDGE_SUPERSEDED)
        );
        Self {
            name: ERROR_NAME,
            cancelled,
            domain: error.domain,
            code: Some(error.code),
            message: error.message,
        }
    }
}

fn outcome<T: DeserializeOwned>(ok: bool, payload: &str) -> Result<T, PasskeyError> {
    if ok {
        serde_json::from_str(payload)
            .map_err(|error| PasskeyError::bridge(format!("unreadable passkey result: {error}")))
    } else {
        Err(serde_json::from_str::<NativeError>(payload)
            .map(PasskeyError::from)
            .unwrap_or_else(|error| {
                PasskeyError::bridge(format!("unreadable passkey error: {error}"))
            }))
    }
}

fn reject_prf(salt: &[u8]) -> Result<(), PasskeyError> {
    if salt.is_empty() {
        Ok(())
    } else {
        Err(PasskeyError::bridge(
            "the iOS passkey bridge does not support PRF",
        ))
    }
}

// The bridge hands its entry points over from a load-time constructor rather than being found with
// `dlsym`: nothing references them at link time, so an archived build's dead-stripping and symbol
// stripping would remove them. Cargo cannot link to them either, since Xcode compiles the bridge later.
#[cfg(target_os = "ios")]
pub mod bridge {
    use std::ffi::{c_char, c_void, CStr, CString};
    use std::sync::OnceLock;

    use tokio::sync::oneshot;

    use super::{outcome, reject_prf, LoginResult, PasskeyError, RegistrationResult};

    type Callback = unsafe extern "C" fn(context: *mut c_void, ok: bool, payload: *const c_char);
    type Register = unsafe extern "C" fn(
        *const c_char,
        *const u8,
        usize,
        *const c_char,
        *const u8,
        usize,
        *mut c_void,
        Callback,
    );
    type Login = unsafe extern "C" fn(*const c_char, *const u8, usize, *mut c_void, Callback);

    type Outcome = (bool, String);

    struct EntryPoints {
        register: Register,
        login: Login,
    }

    static ENTRY_POINTS: OnceLock<EntryPoints> = OnceLock::new();

    #[no_mangle]
    pub extern "C" fn dxos_passkey_bridge_install(register: Register, login: Login) {
        let _ = ENTRY_POINTS.set(EntryPoints { register, login });
    }

    pub fn available() -> bool {
        ENTRY_POINTS.get().is_some()
    }

    fn entry_points() -> Result<&'static EntryPoints, PasskeyError> {
        ENTRY_POINTS
            .get()
            .ok_or_else(|| PasskeyError::bridge("passkey bridge not built into this app"))
    }

    unsafe extern "C" fn on_outcome(context: *mut c_void, ok: bool, payload: *const c_char) {
        // SAFETY: `context` is the sender boxed by `request`, which the bridge hands back exactly once.
        let sender = unsafe { Box::from_raw(context.cast::<oneshot::Sender<Outcome>>()) };
        let payload = if payload.is_null() {
            String::new()
        } else {
            unsafe { CStr::from_ptr(payload) }
                .to_string_lossy()
                .into_owned()
        };
        let _ = sender.send((ok, payload));
    }

    async fn request(start: impl FnOnce(*mut c_void, Callback)) -> Result<Outcome, PasskeyError> {
        let (sender, receiver) = oneshot::channel::<Outcome>();
        start(Box::into_raw(Box::new(sender)).cast(), on_outcome);
        receiver
            .await
            .map_err(|_| PasskeyError::bridge("the passkey bridge dropped the request"))
    }

    fn c_string(value: String) -> Result<CString, PasskeyError> {
        CString::new(value)
            .map_err(|_| PasskeyError::bridge("passkey argument contains a NUL byte"))
    }

    #[tauri::command]
    pub async fn register_passkey(
        domain: String,
        challenge: Vec<u8>,
        username: String,
        user_id: Vec<u8>,
        salt: Vec<u8>,
    ) -> Result<RegistrationResult, PasskeyError> {
        reject_prf(&salt)?;
        let register = entry_points()?.register;
        let (domain, username) = (c_string(domain)?, c_string(username)?);
        let (ok, payload) = request(|context, callback| unsafe {
            register(
                domain.as_ptr(),
                challenge.as_ptr(),
                challenge.len(),
                username.as_ptr(),
                user_id.as_ptr(),
                user_id.len(),
                context,
                callback,
            )
        })
        .await?;
        outcome(ok, &payload)
    }

    #[tauri::command]
    pub async fn login_passkey(
        domain: String,
        challenge: Vec<u8>,
        salt: Vec<u8>,
    ) -> Result<LoginResult, PasskeyError> {
        reject_prf(&salt)?;
        let login = entry_points()?.login;
        let domain = c_string(domain)?;
        let (ok, payload) = request(|context, callback| unsafe {
            login(
                domain.as_ptr(),
                challenge.as_ptr(),
                challenge.len(),
                context,
                callback,
            )
        })
        .await?;
        outcome(ok, &payload)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn native_error(domain: &str, code: i64) -> String {
        serde_json::json!({ "domain": domain, "code": code, "message": "message" }).to_string()
    }

    #[test]
    fn reads_a_login_result_as_the_bridge_writes_it() {
        let payload = r#"{"id":"aWQ","raw_id":"aWQ","client_data_json":"Y2Q","authenticator_data":"YWQ","signature":"c2ln","user_handle":"dWg","prf_output":[]}"#;
        let result: LoginResult = outcome(true, payload).unwrap();
        assert_eq!(result.user_handle, "dWg");
        assert_eq!(result.signature, "c2ln");
        assert!(result.prf_output.is_empty());
    }

    #[test]
    fn reads_a_registration_result_as_the_bridge_writes_it() {
        let payload = r#"{"id":"aWQ","raw_id":"aWQ","client_data_json":"Y2Q","attestation_object":"YW8","prf_output":[]}"#;
        let result: RegistrationResult = outcome(true, payload).unwrap();
        assert_eq!(result.attestation_object, "YW8");
    }

    #[test]
    fn a_dismissed_sheet_is_cancelled() {
        let error = outcome::<LoginResult>(false, &native_error(AUTHORIZATION_ERROR_DOMAIN, 1001))
            .unwrap_err();
        assert!(error.cancelled);
    }

    #[test]
    fn a_superseded_request_is_cancelled() {
        let error =
            outcome::<LoginResult>(false, &native_error(BRIDGE_ERROR_DOMAIN, 1)).unwrap_err();
        assert!(error.cancelled);
    }

    #[test]
    fn other_authorization_errors_are_not_cancelled() {
        for code in [1000, 1002, 1003, 1004, 1005, 1006] {
            let error =
                outcome::<LoginResult>(false, &native_error(AUTHORIZATION_ERROR_DOMAIN, code))
                    .unwrap_err();
            assert!(!error.cancelled, "{code}");
        }
    }

    #[test]
    fn a_cancel_code_from_another_domain_is_not_cancelled() {
        let error =
            outcome::<LoginResult>(false, &native_error("NSCocoaErrorDomain", 1001)).unwrap_err();
        assert!(!error.cancelled);
    }

    #[test]
    fn an_unreadable_payload_is_a_failure() {
        assert!(!outcome::<LoginResult>(false, "").unwrap_err().cancelled);
        assert!(!outcome::<LoginResult>(true, "{}").unwrap_err().cancelled);
    }

    #[test]
    fn a_prf_salt_is_refused() {
        assert!(reject_prf(&[]).is_ok());
        assert!(!reject_prf(&[1]).unwrap_err().cancelled);
    }

    #[test]
    fn serializes_for_the_page() {
        let error = outcome::<LoginResult>(false, &native_error(AUTHORIZATION_ERROR_DOMAIN, 1001))
            .unwrap_err();
        assert_eq!(
            serde_json::to_value(error).unwrap(),
            serde_json::json!({
                "name": "NativePasskeyError",
                "cancelled": true,
                "domain": AUTHORIZATION_ERROR_DOMAIN,
                "code": 1001,
                "message": "message",
            })
        );
    }
}
