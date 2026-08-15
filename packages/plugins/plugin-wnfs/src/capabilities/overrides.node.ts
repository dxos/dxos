//
// Copyright 2026 DXOS.org
//

// This plugin contributes nothing outside the browser: every canonical module (Translations,
// Dependencies, BlobBackend, PluginAsset) only ever ran in the old browser variant, so there is
// no per-module `environments` annotation to drive generation. This file's presence — not its
// (empty) content — is the signal `dx-plugin gen` needs to still emit a fully-stubbed `node`
// barrel, keeping the plugin's dependencies out of headless resolution.
