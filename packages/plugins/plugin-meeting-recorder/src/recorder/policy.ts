//
// Copyright 2026 DXOS.org
//

import { type MeetingRecorderCapabilities } from '#types';

/**
 * Apps that take the microphone for something other than a meeting. Seeded from anarlog's
 * `AppCategory` lists (dictation, IDEs, screen recorders, AI assistants).
 */
export const DEFAULT_IGNORED_APPS: readonly string[] = [
  // Dictation.
  'com.electron.wispr-flow',
  'com.superduper.superwhisper',
  'com.prakashjoshipax.VoiceInk',
  'com.goodsnooze.macwhisper',
  'com.apple.VoiceMemos',
  // IDEs and terminals.
  'com.microsoft.VSCode',
  'dev.warp.Warp-Stable',
  'com.todesktop.230313mzl4w4u92',
  // Screen recording.
  'com.loom.desktop',
  'com.obsproject.obs-studio',
  'com.timpler.screenstudio',
  'so.cap.desktop',
  'pl.maketheweb.cleanshotx',
  'com.apple.QuickTimePlayerX',
  'com.apple.screenshot.launcher',
  // AI assistants.
  'com.openai.chat',
  'com.anthropic.claudefordesktop',
  // Other.
  'com.raycast.macos',
  'com.apple.garageband10',
  'com.apple.Sound-Settings.extension',
  'com.apple.siri',
];

/** Friendly names for the apps meetings are held in; any other app is named as the OS reports it. */
const MEETING_APPS: Record<string, string> = {
  'us.zoom.xos': 'Zoom',
  'com.microsoft.teams2': 'Microsoft Teams',
  'com.microsoft.teams': 'Microsoft Teams',
  'com.apple.FaceTime': 'FaceTime',
  'com.tinyspeck.slackmacgap': 'Slack',
  'com.hnc.Discord': 'Discord',
  'com.cisco.webexmeetingsapp': 'Webex',
  'com.google.Chrome': 'Google Chrome',
  'com.apple.Safari': 'Safari',
  'company.thebrowser.Browser': 'Arc',
  'org.mozilla.firefox': 'Firefox',
};

export const appDisplayName = (app: MeetingRecorderCapabilities.MicApp): string => MEETING_APPS[app.id] ?? app.name;

/**
 * Picks the app a detection event is about: the first one not ignored, preferring a known meeting
 * app when several took the microphone together.
 */
export const selectMeetingApp = (
  apps: readonly MeetingRecorderCapabilities.MicApp[],
  ignored: readonly string[] = DEFAULT_IGNORED_APPS,
): MeetingRecorderCapabilities.MicApp | undefined => {
  const candidates = apps.filter((app) => app.id.length > 0 && !ignored.includes(app.id));
  return candidates.find((app) => app.id in MEETING_APPS) ?? candidates[0];
};

/** Default meeting name, e.g. `Zoom meeting · Oct 13, 11:05 AM`. */
export const defaultMeetingName = (app: MeetingRecorderCapabilities.MicApp | undefined, date: Date): string => {
  const when = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return app ? `${appDisplayName(app)} meeting · ${when}` : `Meeting · ${when}`;
};
