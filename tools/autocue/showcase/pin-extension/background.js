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

const MARK = "document.documentElement.setAttribute('data-window-pinned', '')";
const UNMARK = "document.documentElement.removeAttribute('data-window-pinned')";

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
    await chrome.debugger.sendCommand(target, 'Runtime.evaluate', { expression: UNMARK }).catch(() => {});
    await chrome.debugger.detach(target).catch(() => {});
    pinned.delete(tab.id);
    show(tab.id, false);
    return;
  }
  try {
    await chrome.debugger.attach(target, PROTOCOL);
    await chrome.debugger.sendCommand(target, 'Emulation.setDeviceMetricsOverride', METRICS);
    // Tells the page it is pinned (Composer then keeps its edge rails square), now and on every reload while pinned.
    await chrome.debugger.sendCommand(target, 'Page.addScriptToEvaluateOnNewDocument', { source: MARK });
    await chrome.debugger.sendCommand(target, 'Runtime.evaluate', { expression: MARK });
    pinned.add(tab.id);
    show(tab.id, true);
  } catch (error) {
    // Chrome's own pages (chrome://, the Web Store) cannot be attached to; say so on the button, not as a crash.
    await chrome.debugger.detach(target).catch(() => {});
    chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#b91c1c' });
    chrome.action.setTitle({ tabId: tab.id, title: `Cannot pin this tab: ${error.message}` });
  }
});

// Closing Chrome's debugging banner, or the tab, detaches; the pin is gone with it.
chrome.debugger.onDetach.addListener(({ tabId }) => {
  pinned.delete(tabId);
  show(tabId, false);
});
