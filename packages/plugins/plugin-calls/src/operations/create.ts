// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { TranscriptOperation } from '@dxos/plugin-transcription/types';
import { getSpace } from '@dxos/react-client/echo';

import { Call, CallOperation } from '#types';

const handler: Operation.WithHandler<typeof CallOperation.Create> = CallOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, channel }) {
      const space = getSpace(channel);
      invariant(space);
      const { object: transcript } = yield* Operation.invoke(TranscriptOperation.Create, { space });
      const call = Call.make({
        name,
        transcript: Ref.make(transcript),
      });

      return { object: call };
    }),
  ),
);

export default handler;
