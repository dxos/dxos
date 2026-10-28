//
// Copyright 2026 DXOS.org
//

/** Decoded audio: one Float32Array (-1..1) per channel, all the same length. */
export type Pcm = { sampleRate: number; channels: Float32Array[] };

/**
 * Joins clips end to end, at the first clip's sample rate and the most channels any has; a mono clip fills every
 * channel. Clips at another sample rate must be resampled first (an `OfflineAudioContext` does it on decode).
 */
export const concatPcm = (clips: readonly Pcm[]): Pcm => {
  const sampleRate = clips[0]?.sampleRate ?? 48_000;
  const channelCount = Math.max(1, ...clips.map((clip) => clip.channels.length));
  const length = clips.reduce((sum, clip) => sum + (clip.channels[0]?.length ?? 0), 0);
  const channels = Array.from({ length: channelCount }, () => new Float32Array(length));
  let offset = 0;
  for (const clip of clips) {
    const clipLength = clip.channels[0]?.length ?? 0;
    channels.forEach((channel, index) => {
      const source = clip.channels[index] ?? clip.channels[0];
      if (source) {
        channel.set(source, offset);
      }
    });
    offset += clipLength;
  }
  return { sampleRate, channels };
};

/** 16-bit PCM WAV bytes of `pcm`. */
export const encodeWav = ({ sampleRate, channels }: Pcm): Uint8Array<ArrayBuffer> => {
  const channelCount = channels.length;
  const frames = channels[0]?.length ?? 0;
  const dataSize = frames * channelCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) =>
    [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));

  text(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * 2, true);
  view.setUint16(32, channelCount * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
};
