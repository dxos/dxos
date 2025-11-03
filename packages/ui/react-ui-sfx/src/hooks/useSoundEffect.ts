//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

//
// TODO(burdon): Event types.
// Notifications: Message, Incoming Ring, Error
// Audio: Deafen, Undeafen, Mute, Unmute
// Call: User Join, User Leave, Stream Started, Stream Ended, Question
// General: Activity Start, Activity End
// AI: Thinking, Answered
//

export type SoundEffect = 'Click' | 'StartRecording' | 'StopRecording' | 'JoinCall' | 'LeaveCall';

/**
 * https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/r2/default/buckets/media
 */
// TODO(burdon): Package assets.
const SOUND_EFFECTS: Record<SoundEffect, string> = {
  Click: 'https://dxos.network/sound-click.wav',
  StartRecording: 'https://dxos.network/sound-on.wav',
  StopRecording: 'https://dxos.network/sound-off.wav',
  JoinCall: 'https://dxos.network/sound-call-join.mp3',
  LeaveCall: 'https://dxos.network/sound-call-leave.mp3',
};

export const useSoundEffect = (effect?: SoundEffect) =>
  useMemo(() => new Audio(SOUND_EFFECTS[effect ?? 'Click']), [effect]);
