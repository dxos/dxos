//! Channel-aware update checks.
//!
//! `tauri.conf.json` bakes one `?channel=` into the updater endpoint at build time and the JS
//! `check()` has no way to override it (`CheckOptions` carries only headers/timeout/proxy/target/
//! allowDowngrades), so moving between release channels has to rebuild the updater here against a
//! rewritten endpoint.

use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_updater::{Updater, UpdaterExt};
use url::Url;

/// Download progress, mirrored onto the JS update status. Named for the app rather than the plugin
/// so it cannot collide with `tauri://update-*`.
pub const PROGRESS_EVENT: &str = "composer://update-progress";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
enum Progress {
    Started { content_length: Option<u64> },
    Progress { chunk_length: usize },
    Finished,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
}

/// The configured endpoint with its `channel` query swapped for `channel`. Read from the config
/// rather than repeated here so the URL cannot drift from the one `cn-config` writes at build time.
fn endpoint<R: Runtime>(app: &AppHandle<R>, channel: &str) -> Result<Url, String> {
    let configured = app
        .config()
        .plugins
        .0
        .get("updater")
        .and_then(|updater| updater.get("endpoints"))
        .and_then(|endpoints| endpoints.as_array())
        .and_then(|endpoints| endpoints.first())
        .and_then(|endpoint| endpoint.as_str())
        .ok_or("no updater endpoint is configured")?;
    let base = configured.split('?').next().unwrap_or(configured);
    Url::parse(&format!("{base}?channel={channel}")).map_err(|err| err.to_string())
}

fn updater<R: Runtime>(app: &AppHandle<R>, channel: &str, allow_downgrade: bool) -> Result<Updater, String> {
    let mut builder = app
        .updater_builder()
        .endpoints(vec![endpoint(app, channel)?])
        .map_err(|err| err.to_string())?;
    if allow_downgrade {
        // A channel that trails the running build offers only lower versions, so the default
        // "must be greater" comparison would refuse the move outright. Set only by a deliberate
        // channel switch — a routine check must never walk the user backwards.
        builder = builder.version_comparator(|current, release| release.version != current);
    }
    builder.build().map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn check_channel_update(
    app: AppHandle,
    channel: String,
    allow_downgrade: bool,
) -> Result<Option<UpdateInfo>, String> {
    let update = updater(&app, &channel, allow_downgrade)?
        .check()
        .await
        .map_err(|err| err.to_string())?;
    Ok(update.map(|update| UpdateInfo {
        version: update.version,
        current_version: update.current_version,
    }))
}

/// Returns false when the channel has nothing to offer. Re-checks rather than holding the `Update`
/// from a previous call: it is not `Send`-friendly to park in app state, and the extra request is
/// one round trip against a CDN.
#[tauri::command]
pub async fn install_channel_update(app: AppHandle, channel: String, allow_downgrade: bool) -> Result<bool, String> {
    let Some(update) = updater(&app, &channel, allow_downgrade)?
        .check()
        .await
        .map_err(|err| err.to_string())?
    else {
        return Ok(false);
    };

    let chunk_app = app.clone();
    let finish_app = app.clone();
    let mut started = false;
    update
        .download_and_install(
            move |chunk_length, content_length| {
                if !started {
                    started = true;
                    let _ = chunk_app.emit(PROGRESS_EVENT, Progress::Started { content_length });
                }
                let _ = chunk_app.emit(PROGRESS_EVENT, Progress::Progress { chunk_length });
            },
            move || {
                let _ = finish_app.emit(PROGRESS_EVENT, Progress::Finished);
            },
        )
        .await
        .map_err(|err| err.to_string())?;

    Ok(true)
}
