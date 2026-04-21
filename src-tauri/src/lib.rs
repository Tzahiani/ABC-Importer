use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

fn log_dev(msg: impl AsRef<str>) {
    if cfg!(debug_assertions) {
        eprintln!("[abc-muse-app] {}", msg.as_ref());
    }
}

#[tauri::command]
fn save_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| friendly_io_error("שמירה", &e.to_string()))
}

#[tauri::command]
fn save_binary_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(&path, bytes).map_err(|e| friendly_io_error("שמירה", &e.to_string()))
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| friendly_io_error("קריאה", &e.to_string()))
}

fn friendly_io_error(action: &str, raw: &str) -> String {
    if raw.contains("os error 5") || raw.contains("Access is denied") {
        return format!("אין הרשאה ל{} לקובץ בתיקייה הזו. נסו תיקייה אחרת (למשל מסמכים).", action);
    }
    if raw.contains("not found") {
        return format!("הקובץ לא נמצא.");
    }
    format!("לא ניתן לבצע {}: {}", action, raw)
}

#[derive(serde::Serialize)]
pub struct MuseScoreFindResult {
    pub path: Option<String>,
    pub searched: Vec<String>,
}

#[tauri::command]
fn find_musescore() -> MuseScoreFindResult {
    let mut searched = vec![];
    let mut candidates: Vec<PathBuf> = vec![];

    if let Ok(env_path) = std::env::var("MUSESCORE_PATH") {
        searched.push(env_path.clone());
        candidates.push(PathBuf::from(env_path));
    }

    #[cfg(target_os = "windows")]
    {
        let bases = [
            r"C:\Program Files\MuseScore 4\bin\MuseScore4.exe",
            r"C:\Program Files\MuseScore 3\bin\MuseScore3.exe",
            r"C:\Program Files (x86)\MuseScore 3\bin\MuseScore3.exe",
        ];
        for b in bases {
            searched.push(b.to_string());
            candidates.push(PathBuf::from(b));
        }
    }
    #[cfg(target_os = "macos")]
    {
        let paths = [
            "/Applications/MuseScore 4.app/Contents/MacOS/MuseScore 4",
            "/Applications/MuseScore 3.app/Contents/MacOS/MuseScore 3",
        ];
        for p in paths {
            searched.push(p.to_string());
            candidates.push(PathBuf::from(p));
        }
    }

    for c in &candidates {
        if c.exists() {
            log_dev(format!("MuseScore found: {:?}", c));
            return MuseScoreFindResult {
                path: Some(c.to_string_lossy().to_string()),
                searched,
            };
        }
    }

    MuseScoreFindResult {
        path: None,
        searched,
    }
}

#[tauri::command]
fn open_file_with_app(app_path: String, file_path: String) -> Result<(), String> {
    let app = Path::new(&app_path);
    let file = Path::new(&file_path);
    if !app.exists() {
        return Err("יישום היעד לא נמצא בנתיב שנבדק.".to_string());
    }
    if !file.exists() {
        return Err("הקובץ לפתיחה לא נמצא.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new(&app_path)
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("לא ניתן להפעיל את MuseScore: {}", e))?;
        return Ok(());
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new(&app_path)
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("לא ניתן להפעיל את התוכנה: {}", e))?;
        Ok(())
    }
}

#[tauri::command]
fn open_path_default(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| format!("לא ניתן לפתוח את הקובץ: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            save_text_file,
            save_binary_file,
            read_text_file,
            find_musescore,
            open_file_with_app,
            open_path_default
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
