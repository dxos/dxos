//
// Copyright 2025 DXOS.org
//

/**
 * Ports the Tauri localhost asset server binds, one per release channel — each channel installs as its
 * own app and needs its own origin, since a shared port let whichever app bound it first serve its code
 * to the others.
 * Must match `ReleaseChannel::localhost_port` in `src-tauri/src/channel.rs`.
 */
export const TAURI_LOCALHOST_PORTS = ['26777', '26778', '26779', '26780'];
