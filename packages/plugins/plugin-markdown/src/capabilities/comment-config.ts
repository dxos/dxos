//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { createDocAccessor, getTextInRange } from '@dxos/echo-db';

import { MarkdownOperation } from '#types';
import { Markdown } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const config: AppCapabilities.CommentConfig = {
      id: Type.getTypename(Markdown.Document),
      comments: 'anchored',
      selectionMode: 'multi-range',
      getAnchorLabel: (doc: Markdown.Document, anchor: string): string | undefined => {
        if (doc.content) {
          const [start, end] = anchor.split(':');
          return getTextInRange(createDocAccessor(doc.content.target!, ['content']), start, end);
        }
      },
      scrollToAnchor: MarkdownOperation.ScrollToAnchor,
    };
    return Capability.contributes(AppCapabilities.CommentConfig, config);
  }),
);
