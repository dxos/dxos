//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Type } from '@dxos/echo';

import { Markdown, MarkdownOperation } from '#types';

export const CommentConfig = AppCapability.commentConfig(
  Effect.fnUntraced(function* () {
    const config: AppCapabilities.CommentConfig = {
      id: Type.getTypename(Markdown.Document),
      comments: 'anchored',
      selectionMode: 'multi-range',
      scrollToAnchor: MarkdownOperation.ScrollToAnchor,
    };
    return [Capability.contribute(AppCapabilities.CommentConfig, config)];
  }),
);
