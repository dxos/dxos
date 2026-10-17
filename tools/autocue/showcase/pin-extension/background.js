//
// Copyright 2026 DXOS.org
//

// The page size autocue records at: the page lays out at 1920x1080 CSS pixels and renders at 2x.
const METRICS = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 2,
  mobile: false,
  screenWidth: 1920,
  screenHeight: 1080,
};
const PROTOCOL = '1.3';

/** Tabs this extension has pinned; the override lives as long as the debugger stays attached to the tab. */
const pinned = new Set();

const show = (tabId, on) => {
  chrome.action.setBadgeText({ tabId, text: on ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#1d4ed8' });
  chrome.action.setTitle({
    tabId,
    title: on ? 'Pinned to 1920x1080 at 2x (click to release)' : 'Pin this tab to 1920x1080 at 2x',
  });
};

chrome.action.onClicked.addListener(async (tab) => {
  const target = { tabId: tab.id };
  if (pinned.has(tab.id)) {
    await chrome.debugger.detach(target).catch(() => {});
    pinned.delete(tab.id);
    show(tab.id, false);
    return;
  }
  await chrome.debugger.attach(target, PROTOCOL);
  await chrome.debugger.sendCommand(target, 'Emulation.setDeviceMetricsOverride', METRICS);
  pinned.add(tab.id);
  show(tab.id, true);
});

// Closing Chrome's debugging banner, or the tab, detaches; the pin is gone with it.
chrome.debugger.onDetach.addListener(({ tabId }) => {
  pinned.delete(tabId);
  show(tabId, false);
});
