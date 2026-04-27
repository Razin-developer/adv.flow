use tauri::Manager;
mod macro_engine;
mod workflows;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_thread_ids(true)
        .with_target(true)
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state = workflows::init_state(app.handle());
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            workflows::get_workflows,
            workflows::create_workflow,
            workflows::toggle_favorite,
            workflows::duplicate_workflow,
            workflows::delete_workflow,
            workflows::get_workflow,
            workflows::update_workflow,
            workflows::test_node,
            workflows::execute_workflow,
            workflows::get_settings,
            workflows::save_settings,
            workflows::test_mongodb_connection,
            workflows::sync_local_workflows_to_mongodb,
            workflows::sync_mongodb_workflows_to_local,
            workflows::export_workflow,
            workflows::export_all_workflows,
            workflows::import_workflows,
            workflows::import_workflow,
            workflows::list_installed_apps,
            workflows::generate_workflow_from_prompt,
            workflows::generate_workflow_from_folder,
            workflows::suggest_node_update,
            workflows::list_local_models,
            workflows::ensure_in_app_listener,
            macro_engine::is_running_as_admin,
            macro_engine::restart_as_admin,
            macro_engine::move_mouse,
            macro_engine::mouse_click,
            macro_engine::mouse_double_click,
            macro_engine::mouse_scroll,
            macro_engine::type_text,
            macro_engine::press_key,
            macro_engine::hotkey,
            macro_engine::wait_ms,
            macro_engine::open_app,
            macro_engine::run_command,
            macro_engine::replay_macro
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
