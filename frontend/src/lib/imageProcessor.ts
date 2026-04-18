// src/lib/imageProcessor.ts
export const processImageWithWasm = async (file: File): Promise<Blob> => {
    // Vite環境などでWASMの動的インポートがうまくいくようにパスは要調整
    const wasm = await import('../wasm/wasm_image_processor');
    await wasm.default();

    const arrayBuffer = await file.arrayBuffer();
    const processedBytes = wasm.process_image(new Uint8Array(arrayBuffer));

    return new Blob([new Uint8Array(processedBytes)], { type: 'image/jpeg' });
};