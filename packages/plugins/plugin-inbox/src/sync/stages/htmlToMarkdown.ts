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
 * reads nothing from the context.
 */
export const htmlToMarkdownStage = <In extends Bodied>(id = 'html-to-markdown'): Stage.Stage<In, In, unknown, never> =>
  Stage.map(id, (item) => Effect.sync(() => ({ ...item, body: normalizeText(item.body) })));
