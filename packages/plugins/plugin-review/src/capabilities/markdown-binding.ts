//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj, Type } from '@dxos/echo';
import { Markdown, MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { ReviewCapabilities } from '#types';

import { useMarkdownEditorBinding } from '../hooks';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      // The markdown editor's version-aware subject binding + review affordances — markdown owns the
      // socket, versioning owns the behaviour (same inversion as the comment-sync extension).
      Capability.contribute(MarkdownCapabilities.EditorBindingHook, useMarkdownEditorBinding),
      // Gates the History companion for markdown documents.
      Capability.contribute(ReviewCapabilities.HistoryProvider, {
        id: Type.getTypename(Markdown.Document),
        getTarget: (object) => (Obj.instanceOf(Markdown.Document, object) ? object.content.target : undefined),
      }),
    ];
  }),
);
