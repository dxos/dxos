//
// Copyright 2026 DXOS.org
//

import { Obj, Ref, Relation } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Space } from '@dxos/react-client/echo';
import { type Text } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';

/**
 * Seeds anchored comment threads over the given phrases, so the editor renders the highlighted ranges
 * and the companion lists the threads. Threads are real ECHO objects rather than dispatched decorations:
 * a story-local `comments()` extension would be cleared by the plugin's own instance, which primes the
 * shared comment state from the database.
 */
export const seedComments = (space: Space, doc: Markdown.Document, text: Text.Text, phrases: string[]): void => {
  const accessor = Doc.createAccessor(text, ['content']);
  const content = text.content;
  for (const phrase of phrases) {
    const start = content.indexOf(phrase);
    if (start < 0) {
      continue;
    }

    const anchor = toCursorRange(accessor, start, start + phrase.length);
    const thread = space.db.add(
      Thread.make({
        name: phrase,
        status: 'active',
        messages: [
          Ref.make(
            Obj.make(Message.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user', name: 'Alice' },
              blocks: [{ _tag: 'text', text: `Comment on “${phrase}”.` }],
            }),
          ),
        ],
      }),
    );
    space.db.add(
      Relation.make(AnchoredTo.AnchoredTo, {
        [Relation.Source]: thread,
        [Relation.Target]: doc,
        anchor,
      }),
    );
  }
};
