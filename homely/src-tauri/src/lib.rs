#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![automation_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Automation wiring: the orchestrator's ws port is passed via the
/// HOMELY_AUTOMATION_PORT env var of THIS process (see docs/specs/ws-protocol.md
/// and PLAN.md C7/D2 launch recipe). The frontend asks for it at boot.
#[tauri::command]
fn automation_port() -> Option<String> {
    std::env::var("HOMELY_AUTOMATION_PORT")
        .ok()
        .filter(|p| !p.is_empty())
}
