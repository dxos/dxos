//
// Copyright 2026 DXOS.org
//

const COMMANDS: &[&str] = &[
    "get_support",
    "list_mic_apps",
    "start_detection",
    "stop_detection",
    "start_system_audio",
    "stop_system_audio",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
