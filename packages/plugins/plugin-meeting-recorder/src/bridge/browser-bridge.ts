//
// Copyright 2026 DXOS.org
//

import { type MeetingRecorderCapabilities } from '#types';

/**
 * A browser cannot see other apps or tap the system mix, so recording falls back to the microphone
 * and detection never fires on its own (`HandleDetection` can still be invoked directly).
 */
export const createBrowserBridge = (): MeetingRecorderCapabilities.CaptureBridge => ({
  getSupport: async () => ({ detection: false, systemAudio: false }),
  listMicApps: async () => [],
  startDetection: async () => {},
  stopDetection: async () => {},
  startSystemAudio: async () => {
    throw new Error('System audio capture requires Composer Desktop.');
  },
  stopSystemAudio: async () => {},
});
