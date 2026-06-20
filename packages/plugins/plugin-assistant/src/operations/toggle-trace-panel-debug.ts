//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { AssistantCapabilities, AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.ToggleTracePanelDebug> =
  AssistantOperation.ToggleTracePanelDebug.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        const current = yield* Capabilities.getAtomValue(AssistantCapabilities.Settings);
        const next = input.state ?? !current.tracePanelDebug;
        yield* Capabilities.updateAtomValue(AssistantCapabilities.Settings, (settings) => ({
          ...settings,
          tracePanelDebug: next,
        }));
        return next;
      }),
    ),
  );

export default handler;
