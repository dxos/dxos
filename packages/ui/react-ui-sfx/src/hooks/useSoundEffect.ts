//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

export type SoundEffect = 'Click' | 'StartRecording' | 'StopRecording' | 'JoinCall' | 'LeaveCall';

/**
 * https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/r2/default/buckets/media
 */
const SOUND_EFFECTS: Record<SoundEffect, string> = {
  Click: 'https://dxos.network/sound-click.wav',
  StartRecording: 'https://dxos.network/sound-on.wav',
  StopRecording: 'https://dxos.network/sound-off.wav',
  JoinCall: 'https://dxos.network/sound-call-join.mp3',
  LeaveCall: 'https://dxos.network/sound-call-leave.mp3',
};

export const useSoundEffect = (effect?: SoundEffect) => {
  return useMemo(() => new Audio(SOUND_EFFECTS[effect ?? 'Click']), [effect]);
};
