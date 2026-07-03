//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { normalizeText } from '@dxos/markdown';
import { Stage } from '@dxos/pipeline';

/** An item carrying a body string that may contain HTML. */
export type Bodied = { readonly body: string };

/**
 * Normalizes an item's `body` from (possibly) HTML into markdown via `normalizeText` (turndown when
 * HTML, passthrough for plaintext). Reusable across any provider whose decoded item exposes `body`;
 * requires nothing from the Requirements channel.
 */
export const htmlToMarkdownStage = <In extends Bodied>(id = 'html-to-markdown'): Stage.Stage<In, In, never, never> =>
  Stage.map(id, (item: In) => Effect.sync(() => ({ ...item, body: normalizeText(item.body) })));
