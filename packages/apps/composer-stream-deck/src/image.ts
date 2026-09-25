//
// Copyright 2026 DXOS.org
//

/**
 * Wraps an SVG for `setImage`.
 *
 * The SDK's typings say a bare SVG string is accepted, but the application rejects one and silently
 * falls back to the manifest icon — which looks like a plugin that never ran. Percent-encoded rather
 * than base64: verified against real hardware, where base64 was also rejected.
 */
export const toImageUri = (svg: string): string => `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
