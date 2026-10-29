//
// Copyright 2026 DXOS.org
//

//! Zed extension for DEUS `.mdl` specs: starts `@dxos/mdl-language-server`, the same server the VS Code extension runs.

use std::fs;

use zed_extension_api::{self as zed, settings::LspSettings, LanguageServerId, Result};

const SERVER_ID: &str = "mdl-language-server";

/// The bundled server (one CommonJS file, no `node_modules`), versioned in its name so a new release downloads afresh.
const SERVER_VERSION: &str = "0.1.0";
const SERVER_URL: &str = "https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-10-29-mdl-editor-extensions/mdl-language-server-0.1.0.cjs";

/// A dxos checkout's own build of the server, preferred over the download so a local change is picked up.
const CHECKOUT_SERVER: &str = "tools/mdl-language-server/dist/server.cjs";

struct MdlExtension {
    downloaded: Option<String>,
}

impl MdlExtension {
    /// The downloaded server script, fetched once into the extension's work directory.
    fn downloaded_server(&mut self, id: &LanguageServerId) -> Result<String> {
        if let Some(path) = &self.downloaded {
            if fs::metadata(path).is_ok() {
                return Ok(path.clone());
            }
        }
        let file = format!("mdl-language-server-{SERVER_VERSION}.cjs");
        if fs::metadata(&file).is_err() {
            zed::set_language_server_installation_status(id, &zed::LanguageServerInstallationStatus::Downloading);
            zed::download_file(SERVER_URL, &file, zed::DownloadedFileType::Uncompressed)
                .map_err(|error| format!("failed to download {SERVER_URL}: {error}"))?;
            zed::set_language_server_installation_status(id, &zed::LanguageServerInstallationStatus::None);
        }
        let path = std::env::current_dir()
            .map_err(|error| error.to_string())?
            .join(&file)
            .to_string_lossy()
            .to_string();
        self.downloaded = Some(path.clone());
        Ok(path)
    }
}

impl zed::Extension for MdlExtension {
    fn new() -> Self {
        Self { downloaded: None }
    }

    /// In order: `lsp.mdl-language-server.binary` from settings, `mdl-language-server` on the PATH, the worktree's own
    /// build when it is a dxos checkout, and last the bundle downloaded from the release URL, run with Zed's Node.
    fn language_server_command(&mut self, id: &LanguageServerId, worktree: &zed::Worktree) -> Result<zed::Command> {
        let binary = LspSettings::for_worktree(SERVER_ID, worktree)
            .ok()
            .and_then(|settings| settings.binary);
        if let Some(path) = binary.as_ref().and_then(|binary| binary.path.clone()) {
            let args = binary
                .and_then(|binary| binary.arguments)
                .unwrap_or_else(|| vec!["--stdio".into()]);
            return Ok(zed::Command { command: path, args, env: worktree.shell_env() });
        }
        if let Some(path) = worktree.which(SERVER_ID) {
            return Ok(zed::Command { command: path, args: vec!["--stdio".into()], env: worktree.shell_env() });
        }
        let script = if worktree.read_text_file(CHECKOUT_SERVER).is_ok() {
            format!("{}/{CHECKOUT_SERVER}", worktree.root_path())
        } else {
            self.downloaded_server(id)?
        };
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![script, "--stdio".into()],
            env: Default::default(),
        })
    }
}

zed::register_extension!(MdlExtension);
