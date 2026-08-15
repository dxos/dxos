//
// Copyright 2026 DXOS.org
//

// This plugin contributes nothing to workerd: every canonical module is UI-bound (react-surface,
// markdown-extension, presentation operations) or settings-only, so there is no per-module
// `environments` annotation naming workerd to drive generation. This file's presence — not its
// (empty) content — is the signal `dx-plugin gen` needs to still emit a fully-stubbed `workerd`
// barrel, keeping React out of headless resolution.
