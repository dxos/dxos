//
// Copyright 2024 DXOS.org
//

import browser from 'webextension-polyfill';

browser.runtime.onInstalled.addListener(() => {
  // Chrome specific!
  (browser as any).sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
