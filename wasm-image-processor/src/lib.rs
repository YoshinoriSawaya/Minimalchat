use image::imageops::FilterType;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

// メモリ割り当て時のパニック時にコンソールにエラーを出すためのユーティリティ（任意）
#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    Ok(())
}

/// JS側からUint8Array（画像データ）を受け取り、処理後にUint8Arrayを返す
#[wasm_bindgen]
pub fn process_image(image_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    // 1. 画像のデコード（この時点でExifやGPSデータはメモリ構造から物理的に消滅します）
    let img = image::load_from_memory(image_bytes)
        .map_err(|e| JsValue::from_str(&format!("画像の読み込みに失敗しました: {}", e)))?;

    // 2. リサイズ（最大幅・高さを1024pxに制限、アスペクト比は維持）
    // Lanczos3は少し重いですが、品質が最も高いフィルターです。
    // クライアントのCPUリソースを贅沢に使えるClient-Heavy設計の恩恵ですね。
    let resized = img.resize(1024, 1024, FilterType::Lanczos3);

    // 3. WebPまたはJPEGへの再エンコード
    let mut buffer = Cursor::new(Vec::new());

    // 安定性と軽量化のバランスを取り、品質80%のJPEGで出力します
    resized
        .write_to(&mut buffer, image::ImageOutputFormat::Jpeg(80))
        .map_err(|e| JsValue::from_str(&format!("画像のエンコードに失敗しました: {}", e)))?;

    Ok(buffer.into_inner())
}
