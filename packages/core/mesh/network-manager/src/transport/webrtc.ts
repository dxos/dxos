//
// Copyright 2022 DXOS.org
//

let wrtc: any = null;

try {
  wrtc = require('@koush/wrtc');
} catch {}

export { wrtc };
