//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import { AssistantCapabilities, AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.SetTracePanelDebug> =
  AssistantOperation.SetTracePanelDebug.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ state }) {
        yield* Capabilities.updateAtomValue(AssistantCapabilities.Settings, (settings) => ({
          ...settings,
          tracePanelDebug: state,
        }));
        return state;
      }),
    ),
  );

export default handler;
