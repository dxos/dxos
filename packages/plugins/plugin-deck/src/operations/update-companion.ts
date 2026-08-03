//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Attention } from '@dxos/react-ui-attention';

import { makeNodeCompanionValue } from '../hooks/useCompanionGroups';
import { DeckCapabilities } from '../types';

/**
 * Shows a node companion in the complementary sidebar. The subject names a companion of a specific plank
 * (`<plank>/~<variant>`) but only its variant is stored: the sidebar resolves companions against whatever
 * holds attention, so a plugin asking for "the comments companion" gets it on the object in view.
 */
const handler: Operation.WithHandler<typeof LayoutOperation.UpdateCompanion> = LayoutOperation.UpdateCompanion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      if (input.subject === null) {
        // The selection is left intact so reopening the sidebar restores the last panel.
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => ({
          ...state,
          complementarySidebarState: 'collapsed' as const,
        }));
      } else {
        const variant = Attention.getLinkedVariant(input.subject);
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => ({
          ...state,
          complementarySidebarPanel: makeNodeCompanionValue(variant),
          complementarySidebarState: 'expanded' as const,
        }));
      }
    }),
  ),
);

export default handler;
