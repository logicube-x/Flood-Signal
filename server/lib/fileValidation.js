/**
 * Binary magic number / signature validation for uploaded photos.
 * Prevents file-extension spoofing and rejects non-image payloads.
 */

export const MAX_PHOTO_COUNT = 3;
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB per photo

/**
 * Validates buffer magic bytes against supported image formats.
 * @param {Buffer} buffer 
 * @returns {{ valid: boolean, mimeType?: string, ext?: string, error?: string }}
 */
export function validateImageBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { valid: false, error: 'Empty or invalid file payload' };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'File is empty (0 bytes)' };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds maximum allowed size of 4MB (size: ${(buffer.length / 1024 / 1024).toFixed(1)}MB)` };
  }

  // 1. JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { valid: true, mimeType: 'image/jpeg', ext: '.jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { valid: true, mimeType: 'image/png', ext: '.png' };
  }

  // 3. WebP: RIFF (52 49 46 46) ... WEBP (57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, mimeType: 'image/webp', ext: '.webp' };
  }

  return { 
    valid: false, 
    error: 'Unsupported or corrupted image format. Only authentic JPEG, PNG, and WebP images are permitted.' 
  };
}
