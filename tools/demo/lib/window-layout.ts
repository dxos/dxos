//
// Copyright 2026 DXOS.org
//

/**
 * macOS-only window positioning helpers for deterministic recording layout.
 * Targets two "halves" of the primary display:
 *
 *   ┌─────────────────────┬─────────────────────┐
 *   │ Playwright Chromium │ Google Chrome       │
 *   │   (Composer)        │   (Trello + GitHub) │
 *   └─────────────────────┴─────────────────────┘
 *
 * Slack desktop app floats; we just bring it to front after everything else.
 *
 * Graceful degradation: any AppleScript error is logged and swallowed — a
 * missing screen permission or non-macOS host just results in un-positioned
 * windows, not a crashed run.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const runOsa = async (script: string): Promise<string> => {
  try {
    const { stdout } = await execFileAsync('osascript', ['-e', script]);
    return stdout.trim();
  } catch (err) {
    return `__error__:${String(err)}`;
  }
};

/** Read the primary display's usable bounds {x,y,w,h} (minus menu bar / dock). */
export const primaryDisplayBounds = async (): Promise<{ x: number; y: number; w: number; h: number }> => {
  const result = await runOsa(
    'tell application "Finder" to set b to bounds of window of desktop\nreturn b',
  );
  if (result.startsWith('__error__')) {
    // Fallback: common MacBook-Pro 14" effective area.
    return { x: 0, y: 0, w: 1512, h: 945 };
  }
  const [x1, y1, x2, y2] = result.split(',').map((token) => Number.parseInt(token.trim(), 10));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
};

/**
 * Position a Playwright page's window on the LEFT half of the primary display.
 * Uses Playwright's CDP access rather than AppleScript — more reliable than
 * trying to identify "Chromium for Testing" windows by name.
 */
export const positionPlaywrightLeft = async (page: any): Promise<void> => {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { w, h } = await primaryDisplayBounds();
    const halfW = Math.floor(w / 2);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', {
      windowId,
      bounds: { left: 0, top: 0, width: halfW, height: h, windowState: 'normal' },
    });
    await cdp.detach();
  } catch {
    // Swallow — layout is a nice-to-have, not a blocker.
  }
};

/** Position the frontmost Google Chrome window on the RIGHT half via AppleScript. */
export const positionMainChromeRight = async (): Promise<void> => {
  const { w, h } = await primaryDisplayBounds();
  const halfW = Math.floor(w / 2);
  const script = `
    tell application "Google Chrome"
      if (count of windows) > 0 then
        set bounds of front window to {${halfW}, 0, ${w}, ${h}}
        activate
      end if
    end tell
  `;
  await runOsa(script);
};
