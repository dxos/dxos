// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { TranscriptOperation } from '@dxos/plugin-transcription/types';

import { MeetingOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingOperation.Summarize> = MeetingOperation.Summarize.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ meeting }) {
      // The Meeting hub owns the transcript + notes + summary; delegate the LLM work to the transcription
      // operation and write the result back into the meeting's summary document.
      const { content: transcript } = yield* Operation.invoke(TranscriptOperation.Open, {
        transcript: meeting.transcript,
      });
      const notes = yield* Effect.promise(() => meeting.notes.load());
      const { summary } = yield* Operation.invoke(TranscriptOperation.Summarize, {
        transcript,
        notes: notes.content,
      });

      const summaryText = yield* Effect.promise(() => meeting.summary.load());
      Obj.update(summaryText, (summaryText) => {
        summaryText.content = summary;
      });
    }),
  ),
);

export default handler;
