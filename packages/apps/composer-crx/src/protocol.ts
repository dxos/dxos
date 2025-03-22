//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Alt:
// - https://www.npmjs.com/package/webext-bridge
// - https://www.npmjs.com/package/webext-messenger

export interface Context {
  getCurrentUrl: () => string;
  getPageTitle: () => string;
  getSelectedText: () => string;
}
