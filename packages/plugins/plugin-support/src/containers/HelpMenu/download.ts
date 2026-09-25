//
// Copyright 2026 DXOS.org
//

/** CrabNebula's release dashboard. Lists the primary channel only. */
export const DOWNLOAD_URL = 'https://web.crabnebula.cloud/dxos/composer/releases';

// CrabNebula's dashboard has no page for a prerelease channel, so a preview deployment cannot link there
// for its own installer. The CDN's download endpoint can: it is public, channel-addressable, and 302s to
// the channel's latest installer (the DMG, not the updater archive). It has to be a navigation rather
// than a fetch — the CDN sends no CORS headers, so a script here can never read what it happily serves
// the browser.
const DOWNLOAD_ENDPOINT = 'https://cdn.crabnebula.app/download/dxos/composer/latest/platform';

// TODO(wittjosiah): Only macOS is built today; derive this once Windows and Linux ship (`nsis-x86_64`,
// `appimage-x86_64`).
const DOWNLOAD_PLATFORM = 'dmg-aarch64';

/**
 * The CrabNebula channel a deploy environment publishes to, or undefined for the one the dashboard lists.
 * Production ships on `main` — every build bakes its channel into the updater endpoint, so renaming it
 * would strand installs still polling `main`.
 */
export const prereleaseChannel = (environment?: string): string | undefined =>
  environment && environment !== 'production' ? environment : undefined;

/**
 * The help menu's download link: the dashboard on production, a prerelease channel's own latest installer
 * elsewhere. Until a channel's first desktop build publishes, its link answers 404 — a state each channel
 * leaves with its first deploy, not one worth a probe the missing CORS headers would block anyway.
 */
export const downloadUrl = (environment?: string): string => {
  const channel = prereleaseChannel(environment);
  return channel ? `${DOWNLOAD_ENDPOINT}/${DOWNLOAD_PLATFORM}?channel=${encodeURIComponent(channel)}` : DOWNLOAD_URL;
};
