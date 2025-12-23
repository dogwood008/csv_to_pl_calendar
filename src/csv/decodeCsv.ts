const UTF8_DECODER = new TextDecoder("utf-8", { fatal: false });
const SHIFT_JIS_DECODER = (() => {
  try {
    return new TextDecoder("shift_jis", { fatal: false });
  } catch (error) {
    console.warn("Shift_JIS デコーダーの初期化に失敗したため UTF-8 にフォールバックします:", error);
    return null;
  }
})();

function countReplacementChars(text: string): number {
  if (!text) {
    return 0;
  }
  const matches = text.match(/\ufffd/g);
  return matches ? matches.length : 0;
}

function normalizeBuffer(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  if (buffer instanceof Uint8Array) {
    return buffer;
  }
  return new Uint8Array(buffer);
}

export function decodeCsvArrayBuffer(buffer: ArrayBuffer | Uint8Array): string {
  if (!buffer || buffer.byteLength === 0) {
    return "";
  }

  const normalized = normalizeBuffer(buffer);
  const utf8Text = UTF8_DECODER.decode(normalized);
  const utf8Replacements = countReplacementChars(utf8Text);
  if (utf8Replacements === 0) {
    return utf8Text;
  }

  if (SHIFT_JIS_DECODER) {
    try {
      const shiftJisText = SHIFT_JIS_DECODER.decode(normalized);
      const shiftJisReplacements = countReplacementChars(shiftJisText);
      if (shiftJisReplacements === 0 || shiftJisReplacements < utf8Replacements) {
        return shiftJisText;
      }
    } catch (error) {
      console.warn("Shift_JIS でのデコードに失敗したため UTF-8 を使用します:", error);
    }
  }

  return utf8Text;
}
