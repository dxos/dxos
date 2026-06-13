// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';

import { Call, CallOperation, CallsCapabilities } from '#types';

const handler: Operation.WithHandler<typeof CallOperation.SetActive> = CallOperation.SetActive.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object }) {
      const store = yield* Capability.get(CallsCapabilities.RecordState);
      const callManager = yield* Capability.get(CallsCapabilities.Manager);
      store.updateState((current) => ({ ...current, activeCall: object }));
      callManager.setActivity(Type.getTypename(Call.Call)!, {
        meetingId: object ? Obj.getURI(object) : '',
      });
      return { object };
    }),
  ),
);

export default handler;
