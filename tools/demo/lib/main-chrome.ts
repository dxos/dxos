//
// Copyright 2026 DXOS.org
//

/**
 * Open URLs in the user's actual Chrome (the one they're signed into) and
 * focus the Slack desktop app. Deliberately shells out to macOS `open` so
 * existing Chrome profiles, cookies, and extensions are reused — no Playwright
 * profile that would be blank on first run.
 */

import { spawn } from 'node:child_process';

const runOpen = (args: readonly string[]): Promise<void> =>
  new Promise((resolveFn, rejectFn) => {
    const child = spawn('open', [...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', rejectFn);
    child.on('close', (code) => {
      if (code === 0) {
        resolveFn();
      } else {
        rejectFn(new Error(`open ${args.join(' ')} exited ${code}: ${stderr.trim()}`));
      }
    });
  });

/**
 * Open one or more URLs as tabs in the user's main Chrome. First call may
 * create a window if Chrome isn't running. Re-running reuses the existing
 * window and just opens new tabs.
 */
export const openInMainChrome = async (urls: readonly string[]): Promise<void> => {
  if (urls.length === 0) {
    return;
  }
  await runOpen(['-a', 'Google Chrome', ...urls]);
};

/** Bring the Slack desktop app to the front. No-op if not installed. */
export const focusSlackApp = async (): Promise<boolean> => {
  try {
    await runOpen(['-a', 'Slack']);
    return true;
  } catch {
    return false;
  }
};

/** Build the Trello board URL from a `TRELLO_BOARD_ID` (short or long). */
export const trelloBoardUrl = (boardId: string): string => `https://trello.com/b/${boardId}`;

/** Build the GitHub repo URL (or PR list) from a `GITHUB_REPO` like owner/name. */
export const githubRepoUrl = (repo: string, view: 'code' | 'pulls' = 'pulls'): string =>
  view === 'pulls' ? `https://github.com/${repo}/pulls?q=is%3Apr+is%3Aclosed` : `https://github.com/${repo}`;
