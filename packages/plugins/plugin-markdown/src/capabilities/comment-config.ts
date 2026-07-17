//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { getTextInRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';

import { MarkdownOperation } from '#types';
import { Markdown } from '#types';

const activate = Effect.fnUntraced(function* () {
  const config: AppCapabilities.CommentConfig = {
    id: Type.getTypename(Markdown.Document),
    comments: 'anchored',
    selectionMode: 'multi-range',
    getAnchorLabel: (doc: Markdown.Document, anchor: string): string | undefined => {
      const target = doc.content?.target;
      if (target) {
        const [start, end] = anchor.split(':');
        return getTextInRange(Doc.createAccessor(target, ['content']), start, end);
      }
    },
    scrollToAnchor: MarkdownOperation.ScrollToAnchor,
  };
  return [Capability.provide(AppCapabilities.CommentConfig, config)];
});

export default activate;
