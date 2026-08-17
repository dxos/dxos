//
// Copyright 2026 DXOS.org
//

/** CrabNebula's release dashboard. Lists the primary channel only. */
export const DOWNLOAD_URL = 'https://web.crabnebula.cloud/dxos/composer/releases';

// CrabNebula's dashboard has no page for a prerelease channel, so a nightly deployment cannot link there
// for its own installer. Its update endpoint can: it is public, channel-addressable, and the JSON it
// returns names the platform asset — enough to send someone straight at the binary.
const UPDATE_ENDPOINT = 'https://cdn.crabnebula.app/update/dxos/composer';

// TODO(wittjosiah): Only macOS is built today; derive this once Windows and Linux ship (`windows-x86_64`,
// `linux-x86_64`, `darwin-x86_64`).
const UPDATE_PLATFORM = 'darwin-aarch64';

/**
 * The CrabNebula channel a deploy environment publishes to, or undefined for the one the dashboard lists.
 * Production ships on `main` — every build bakes its channel into the updater endpoint, so renaming it
 * would strand installs still polling `main`.
 */
export const prereleaseChannel = (environment?: string): string | undefined =>
  environment && environment !== 'production' ? environment : undefined;

/**
 * Resolve a channel's current download URL.
 * `0.0.0` as the current version so every published build reads as an upgrade and the asset is always
 * returned — this only reads the metadata, it never installs.
 */
export const resolveDownloadUrl = async (channel: string): Promise<string> => {
  const response = await fetch(`${UPDATE_ENDPOINT}/${UPDATE_PLATFORM}/0.0.0?channel=${channel}`);
  if (!response.ok) {
    // A channel with no published build yet answers 404, which is the state every new channel starts in.
    throw new Error(`update endpoint returned ${response.status}`);
  }
  const { url } = (await response.json()) as { url?: string };
  if (!url) {
    throw new Error('update endpoint returned no asset url');
  }
  return url;
};
