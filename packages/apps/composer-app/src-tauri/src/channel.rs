//! Release channel of the running build, and the localhost asset-server port it owns.
//!
//! Desktop release builds serve their bundled frontend over HTTP from `localhost` (SharedWorker needs
//! an HTTP origin), and every channel installs as its own app — so a single shared port meant whichever
//! app bound it first served its code to every other channel's webview. Each channel therefore owns a
//! distinct port.
//!
//! The web origin keys OPFS/IndexedDB/localStorage, so a channel's port is permanent once shipped:
//! moving it orphans every profile stored under the old one. Production therefore keeps the 26777 it
//! has always served from, and each other channel's port is fixed from this change onward.

/// Bundle identifier of the released app. `.github/actions/cn-config` appends `.<environment>` to it
/// for every other channel at build time, so the identifier baked into `tauri.conf.json` is what a
/// running build knows about which channel it is.
const BASE_IDENTIFIER: &str = "org.dxos.composer";

/// Vite dev server, which `tauri dev` points the webview at instead of the bundled asset server.
pub const DEV_SERVER_PORT: u16 = 5173;

/// Release channel a desktop build was produced for.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReleaseChannel {
    Production,
    Staging,
    Preview,
    Dev,
}

impl ReleaseChannel {
    /// Channel a bundle identifier denotes. Anything unrecognised — including the stock identifier a
    /// local `tauri build` produces, which cn-config never rewrote — is production, so an unsigned
    /// local build behaves like the released app.
    pub fn from_identifier(identifier: &str) -> Self {
        match identifier
            .strip_prefix(BASE_IDENTIFIER)
            .and_then(|suffix| suffix.strip_prefix('.'))
        {
            Some("staging") => Self::Staging,
            Some("preview") => Self::Preview,
            Some("dev") => Self::Dev,
            _ => Self::Production,
        }
    }

    /// Port this channel's localhost asset server binds, and therefore the origin its storage lives
    /// under. Permanent — see the module comment. Production's 26777 spells CMPSR on a keypad; the
    /// rest follow it.
    pub const fn localhost_port(self) -> u16 {
        match self {
            Self::Production => 26777,
            Self::Staging => 26778,
            Self::Preview => 26779,
            Self::Dev => 26780,
        }
    }

    /// Human-readable channel name, for the diagnostics a port conflict prints.
    pub const fn label(self) -> &'static str {
        match self {
            Self::Production => "production",
            Self::Staging => "staging",
            Self::Preview => "preview",
            Self::Dev => "dev",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_every_channel_identifier() {
        assert_eq!(
            ReleaseChannel::from_identifier("org.dxos.composer"),
            ReleaseChannel::Production
        );
        assert_eq!(
            ReleaseChannel::from_identifier("org.dxos.composer.staging"),
            ReleaseChannel::Staging
        );
        assert_eq!(
            ReleaseChannel::from_identifier("org.dxos.composer.preview"),
            ReleaseChannel::Preview
        );
        assert_eq!(
            ReleaseChannel::from_identifier("org.dxos.composer.dev"),
            ReleaseChannel::Dev
        );
    }

    #[test]
    fn falls_back_to_production_for_unknown_identifiers() {
        for identifier in ["", "org.dxos.composer.nightly", "org.dxos.composerdev", "com.example.app"] {
            assert_eq!(
                ReleaseChannel::from_identifier(identifier),
                ReleaseChannel::Production,
                "{identifier}"
            );
        }
    }

    /// Production's port is load-bearing: existing installs store their data under that origin.
    #[test]
    fn production_keeps_its_shipped_port() {
        assert_eq!(ReleaseChannel::Production.localhost_port(), 26777);
    }

    #[test]
    fn channels_do_not_share_a_port() {
        let ports = [
            ReleaseChannel::Production,
            ReleaseChannel::Staging,
            ReleaseChannel::Preview,
            ReleaseChannel::Dev,
        ]
        .map(ReleaseChannel::localhost_port);

        let mut unique = ports.to_vec();
        unique.sort_unstable();
        unique.dedup();
        assert_eq!(unique.len(), ports.len(), "duplicate port in {ports:?}");
    }
}
