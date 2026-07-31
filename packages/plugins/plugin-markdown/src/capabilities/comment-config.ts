//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { MarkdownOperation } from '#types';
import { Markdown } from '#types';

const activate = Effect.fnUntraced(function* () {
  const config: AppCapabilities.CommentConfig = {
    id: Type.getTypename(Markdown.Document),
    comments: 'anchored',
    selectionMode: 'multi-range',
    scrollToAnchor: MarkdownOperation.ScrollToAnchor,
  };
  return Capability.contributes(AppCapabilities.CommentConfig, config);
});

export default activate;
