//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Blob, Database, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import type * as Variant from '@dxos/plugin-studio/Variant';
import { File } from '@dxos/types';

import { concatPcm, encodeWav } from '../audio/wav.ts';

/** The recorded bytes of a take; undefined when its file is missing. */
export const loadTakeData = async (take: Variant.Variant): Promise<globalThis.Blob | undefined> => {
  const file = await take.content?.load();
  const db = file && Obj.getDatabase(file);
  if (!file || !db || !Obj.instanceOf(File.File, file)) {
    return undefined;
  }
  const program = Effect.gen(function* () {
    const blob = yield* Database.load(file.data);
    const bytes = yield* Blob.read(blob);
    return new globalThis.Blob([new Uint8Array(bytes)], { type: blob.type ?? take.contentType });
  }).pipe(
    Effect.provide(Database.layer(db)),
    Effect.catch(() => Effect.succeed(undefined)),
  );
  return EffectEx.runPromise(program);
};

/** Export sample rate: decoding at one rate resamples every take to it, so they join without a gap in pitch. */
const SAMPLE_RATE = 48_000;

/** The voice of `takes` joined in order, as a WAV file (the browser cannot join compressed takes without decoding). */
export const exportVoiceOver = async (takes: readonly Variant.Variant[]): Promise<globalThis.Blob> => {
  const context = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  const clips = [];
  for (const take of takes) {
    const data = await loadTakeData(take);
    if (data) {
      const decoded = await context.decodeAudioData(await data.arrayBuffer());
      clips.push({
        sampleRate: decoded.sampleRate,
        channels: Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index)),
      });
    }
  }
  return new globalThis.Blob([encodeWav(concatPcm(clips))], { type: 'audio/wav' });
};
