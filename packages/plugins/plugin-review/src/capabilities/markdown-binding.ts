//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj, Type } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';

import { useMarkdownEditorBinding } from '#hooks';
import { ReviewCapabilities } from '#types';

// Markdown owns the editor-binding socket; this plugin owns the version-aware behaviour, and gates
// the history companion for markdown documents. Browser-only: the binding it contributes is
// `useMarkdownEditorBinding`, a React hook that mounts the version toolbar and suggestion overlays.
export const MarkdownBinding = Capability.makeModule(
  'MarkdownBinding',
  {
    provides: [MarkdownCapabilities.EditorBindingHook, ReviewCapabilities.HistoryProvider],
    activatesOn: MarkdownEvents.Start,
    environments: [],
  },
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
