//
// Copyright 2026 DXOS.org
//

// This plugin contributes nothing outside the browser: every canonical module is UI-bound
// (Surface, PluginAsset), so there is no per-module `environments` annotation to drive
// generation. This file's presence — not its (empty) content — is the signal `dx-plugin gen`
// needs to still emit a fully-stubbed `workerd` barrel, keeping React out of headless resolution.
