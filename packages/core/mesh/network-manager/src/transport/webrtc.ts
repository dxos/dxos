//
// Copyright 2022 DXOS.org
//

/**
 * Will be null if WebRTC is not available in this environment.
 */
let wrtc: any = null;

// Try to load WebRTC if available. This will fail in the shared-worker context.
try {
  wrtc = require('@koush/wrtc');
} catch {}

export { wrtc };
