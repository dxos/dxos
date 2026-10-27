//
// Copyright 2026 DXOS.org
//

import { getHostPlatform } from '@dxos/util';

/**
 * The radius macOS draws on a window's corners, by major version: macOS 26 rounds windows more than earlier releases.
 * No API reports it, so it is a best estimate.
 */
const RADIUS_BEFORE_26 = 10;
const RADIUS_FROM_26 = 16;

type UserAgentData = {
  platform: string;
  getHighEntropyValues: (hints: string[]) => Promise<{ platformVersion?: string }>;
};

const hasUserAgentData = (nav: Navigator): nav is Navigator & { userAgentData: UserAgentData } =>
  'userAgentData' in nav && nav.userAgentData !== undefined;

/** Whether the page runs on macOS, where a window that is not fullscreen has rounded corners. */
const isMacOS = (tauri: boolean): boolean => {
  if (tauri) {
    return getHostPlatform() === 'macos';
  }
  return hasUserAgentData(navigator)
    ? navigator.userAgentData.platform === 'macOS'
    : /Mac/.test(navigator.platform) && navigator.maxTouchPoints === 0;
};

/** The window corner radius for this macOS, from Chromium's platform version where the browser reports it. */
const cornerRadius = async (): Promise<number> => {
  if (!hasUserAgentData(navigator)) {
    return RADIUS_BEFORE_26;
  }
  const { platformVersion } = await navigator.userAgentData
    .getHighEntropyValues(['platformVersion'])
    .catch(() => ({ platformVersion: undefined }));
  return Number(platformVersion?.split('.')[0]) >= 26 ? RADIUS_FROM_26 : RADIUS_BEFORE_26;
};

/** In a browser, a fullscreen window fills the screen and has square corners. */
const isBrowserFullscreen = (): boolean =>
  document.fullscreenElement !== null ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (window.outerWidth >= window.screen.width && window.outerHeight >= window.screen.height);

/**
 * Marks the document when the page's bottom corners are likely a rounded macOS window's: `data-window-corners` is
 * `rounded` (or `square`) on `<html>`, and `--dx-window-radius` holds the radius, so edge-to-edge elements can round
 * their outer bottom corner to match instead of being cut off by the window. A web page cannot see the window's
 * shape, so in a browser this is a heuristic: it cannot tell when DevTools or a side panel sits beside the page.
 */
export const watchWindowCorners = async (tauri: boolean): Promise<void> => {
  const root = document.documentElement;
  if (!isMacOS(tauri)) {
    root.dataset.windowCorners = 'square';
    return;
  }
  root.style.setProperty('--dx-window-radius', `${await cornerRadius()}px`);

  const tauriWindow = tauri ? (await import('@tauri-apps/api/window')).getCurrentWindow() : undefined;
  const update = async () => {
    // A page pinned for recording (Showcase Pin sets `data-window-pinned`) sits clear of the window's corners.
    const pinned = root.dataset.windowPinned !== undefined;
    const fullscreen = tauriWindow ? await tauriWindow.isFullscreen() : isBrowserFullscreen();
    root.dataset.windowCorners = pinned || fullscreen ? 'square' : 'rounded';
  };
  await update();
  window.addEventListener('resize', () => void update());
  document.addEventListener('fullscreenchange', () => void update());
  new MutationObserver(() => void update()).observe(root, {
    attributes: true,
    attributeFilter: ['data-window-pinned'],
  });
};
