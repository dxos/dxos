//! Local notifications, shown by the page while Composer runs; desktop has no push service.
//!
//! macOS reports no permission to the app: the plugin always reads granted, and the user's choice in
//! System Settings decides whether a banner appears. Dev builds show under Terminal's identity.

use tauri::{AppHandle, Runtime};
use tauri_plugin_notification::NotificationExt;

/// The action id the plugin reports for a click on the notification itself.
const TAP_ACTION: &str = "tap";

#[tauri::command]
pub fn show_notification<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    body: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|error| error.to_string())
}

/// A click on a notification brings the main window back, including from the menu bar.
pub fn init<R: Runtime>(app: &AppHandle<R>) -> tauri_plugin_notification::Result<()> {
    let handle = app.clone();
    app.notification().on_action(move |performed| {
        if performed.action_id() == TAP_ACTION {
            crate::show_main_window(&handle);
        }
    })
}
