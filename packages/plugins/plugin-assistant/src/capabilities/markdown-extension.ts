//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as RoutineOperation from '@dxos/plugin-routine/RoutineOperation';

import { promptRunExtension } from '../extensions/index.ts';

export const MarkdownExtension = Capability.makeModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    return Capability.contribute(MarkdownCapabilities.ExtensionProvider, [
      ({ document: doc, viewMode }) => {
        if (viewMode === 'source') {
          return undefined;
        }

        if (!doc) {
          return undefined;
        }

        const db = Obj.getDatabase(doc);
        if (!db) {
          return undefined;
        }

        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);

        return promptRunExtension({
          onRun: (promptText) => {
            void invokePromise(RoutineOperation.RunPromptInNewChat, { db, instructions: promptText });
          },
        });
      },
    ]);
  }),
);
