/**
 * Field Encoding Utilities
 * Provides Base64 encoding for sensitive fields (password, verification code)
 * during transmission from frontend to backend.
 *
 * Note: This uses Base64 encoding for obfuscation, not cryptographic encryption.
 * Real security relies on HTTPS for transport layer encryption.
 */

/**
 * Encode sensitive field using Base64
 * @param plaintext - The plain text to encode
 * @returns Base64 encoded text
 */
function encryptField(plaintext: string): string {
  try {
    // Base64 encode the plaintext
    // btoa works with ASCII, so we need to handle UTF-8 properly
    const utf8Bytes = new TextEncoder().encode(plaintext)
    const base64 = btoa(String.fromCharCode(...utf8Bytes))
    return base64
  }
  catch (error) {
    console.error('Field encoding failed:', error)
    // If encoding fails, throw error to prevent sending plaintext
    throw new Error('Encoding failed. Please check your input.')
  }
}

/**
 * Encrypt password field for login
 * @param password - Plain password
 * @returns Encrypted password or original if encryption disabled
 */
export function encryptPassword(password: string): string {
  return encryptField(password)
}

/**
 * Encrypt verification code for email code login
 * @param code - Plain verification code
 * @returns Encrypted code or original if encryption disabled
 */
export function encryptVerificationCode(code: string): string {
  return encryptField(code)
}

function decryptField(encoded: string): string {
  try {
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++)
      bytes[i] = binary.charCodeAt(i)
    return new TextDecoder().decode(bytes)
  }
  catch (error) {
    console.error('Field decoding failed:', error)
    throw new Error('Decoding failed. Stored credential may be corrupted.')
  }
}

/**
 * Decrypt a password previously produced by {@link encryptPassword}.
 * Used for restoring locally remembered credentials — still obfuscation,
 * not real cryptography.
 */
export function decryptPassword(encoded: string): string {
  return decryptField(encoded)
}
