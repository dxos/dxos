//
// Copyright 2026 DXOS.org
//

/**
 * Shared constants used by both the Vite plugin (Node-side) and the runtimes (browser / worker).
 * Keep this module dependency-free so it remains safe to import from either realm.
 */

/**
 * HTTP sink endpoint served by the dev server. Workers (and any other context without HMR)
 * POST log chunks here; the plugin's middleware appends them to `app.log`.
 */
export const VITE_PLUGIN_LOG_SINK_PATH = '/@dxos-plugin-log/sink';
