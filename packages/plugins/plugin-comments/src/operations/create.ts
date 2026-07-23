//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj, Relation } from '@dxos/echo';
import { Markdown, MarkdownCapabilities } from '@dxos/plugin-markdown';
import { Attention } from '@dxos/react-ui-attention';
import { AnchoredTo, Thread } from '@dxos/types';

import { CommentCapabilities } from '../types';
import { CommentOperation } from '../types';

const handler: Operation.WithHandler<typeof CommentOperation.Create> = CommentOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, anchor: _anchor, subject, branch }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(CommentCapabilities.State);
      const subjectId = Obj.getURI(subject);

      // Inherit the markdown plugin's `commentAgentMode` setting when the
      // subject is a Markdown.Document, so new comment threads on docs are
      // opted-in (or not) based on the user's preference. Non-markdown
      // subjects always get an un-opted thread (no agent).
      const markdownSettingsAtoms = yield* Capability.getAll(MarkdownCapabilities.Settings);
      const markdownSettingsAtom = markdownSettingsAtoms[0];
      const commentAgentMode =
        markdownSettingsAtom && Obj.instanceOf(Markdown.Document, subject)
          ? registry.get(markdownSettingsAtom).commentAgentMode
          : undefined;
      const agent =
        commentAgentMode && commentAgentMode !== 'off' ? { enabled: true, mode: commentAgentMode } : undefined;

      const thread = Thread.make({ name, agent });
      const anchor = Relation.make(AnchoredTo.AnchoredTo, {
        [Relation.Source]: thread,
        [Relation.Target]: subject,
        anchor: _anchor,
        branch,
      });

      const state = registry.get(stateAtom);
      const existingDrafts = state.drafts[subjectId];
      registry.set(stateAtom, {
        ...state,
        drafts: {
          ...state.drafts,
          [subjectId]: existingDrafts ? [...existingDrafts, anchor] : [anchor],
        },
      });

      yield* Operation.invoke(CommentOperation.Select, { current: Obj.getURI(thread) });
      yield* Operation.invoke(LayoutOperation.UpdateCompanion, {
        subject: Attention.linkedSegment('comments'),
      });
    }),
  ),
);

export default handler;
