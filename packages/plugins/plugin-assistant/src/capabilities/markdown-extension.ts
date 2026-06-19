//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { AutomationOperation } from '@dxos/plugin-automation/types';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { promptRunExtension } from '../extensions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    return Capability.contributes(MarkdownCapabilities.ExtensionProvider, [
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
            void invokePromise(AutomationOperation.RunPromptInNewChat, { db, prompt: promptText });
          },
        });
      },
    ]);
  }),
);
