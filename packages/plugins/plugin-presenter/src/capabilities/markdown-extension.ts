//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { keymap } from '@dxos/ui-editor';

import { PresenterOperation } from '#types';

import { isPresenting } from '../paths.ts';

/**
 * Contributes the present shortcut (Shift+Cmd+P) to the markdown editor so presentation
 * can be toggled while editing without relying on the global navtree keyboard context.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    return Capability.contribute(MarkdownCapabilities.ExtensionProvider, [
      ({ document }) => {
        if (!document) {
          return undefined;
        }

        const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
        const registry = capabilities.get(Capabilities.AtomRegistry);
        return Prec.highest(
          keymap.of([
            {
              key: 'Shift-Mod-p',
              preventDefault: true,
              stopPropagation: true,
              run: () => {
                // The shortcut flips, so it reads the current state and states the one it wants.
                void invokePromise(PresenterOperation.SetPresenting, {
                  object: document,
                  state: !isPresenting(registry.get(capabilities.get(DeckCapabilities.EphemeralState)), document),
                });
                return true;
              },
            },
          ]),
        );
      },
    ]);
  }),
);
