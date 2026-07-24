//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { getTextInAnchorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';

import { Markdown } from '#types';

/** Resolve an anchor against the document's loaded text content; `undefined` while the ref is unloaded. */
export const getMarkdownAnchorText = (doc: Markdown.Document, anchor: string): string | undefined => {
  const target = doc.content?.target;
  if (!target) {
    return undefined;
  }
  return getTextInAnchorRange(Doc.createAccessor(target, ['content']), anchor);
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(AppCapabilities.AnchorResolver, {
      key: Type.getTypename(Markdown.Document),
      getText: getMarkdownAnchorText,
    }),
  ),
);
