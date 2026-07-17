//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { keymap } from '@dxos/ui-editor';

import { PresenterOperation } from '#types';

/**
 * Contributes the present shortcut (Shift+Cmd+P) to the markdown editor so presentation
 * can be toggled while editing without relying on the global navtree keyboard context.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    return [
      Capability.provide(MarkdownCapabilities.ExtensionProvider, [
        ({ document }) => {
          if (!document) {
            return undefined;
          }

          const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
          return Prec.highest(
            keymap.of([
              {
                key: 'Shift-Mod-p',
                preventDefault: true,
                stopPropagation: true,
                run: () => {
                  void invokePromise(PresenterOperation.TogglePresentation, { object: document });
                  return true;
                },
              },
            ]),
          );
        },
      ]),
    ];
  }),
);
