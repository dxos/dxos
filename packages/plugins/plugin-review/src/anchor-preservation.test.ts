//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Obj, Relation } from '@dxos/echo';
import { getRangeFromCursor, toCursorRange, updateText } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { invariant } from '@dxos/invariant';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { restoreAnchor, snapshotAnchor } from './anchor-preservation.ts';

const CONTENT = 'Comment threads now run on feeds, and the assistant answers them.';
const PHRASE = 'the assistant answers them';

describe('anchor preservation', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [Markdown.Document, Text.Text, Thread.Thread, Message.Message, Feed.Feed, AnchoredTo.AnchoredTo],
    });
    const doc = db.add(Markdown.make({ name: 'Notes', content: CONTENT }));
    const text = await doc.content.load();
    const accessor = Doc.createAccessor(text, ['content']);
    const start = CONTENT.indexOf(PHRASE);
    const thread = db.add(Thread.make({ status: 'active' }));
    const relation = db.add(
      Relation.make(AnchoredTo.AnchoredTo, {
        [Relation.Source]: thread,
        [Relation.Target]: doc,
        anchor: toCursorRange(accessor, start, start + PHRASE.length),
      }),
    );
    await db.flush({ indexes: true });
    const anchoredText = () => {
      const range = relation.anchor ? getRangeFromCursor(accessor, relation.anchor) : undefined;
      return range ? text.content.slice(range.start, range.end) : undefined;
    };
    return { doc, text, thread, anchoredText };
  };

  test('an edit that replaces the anchored text keeps the comment on the replacement', async ({ expect }) => {
    const { doc, text, thread, anchoredText } = await setup();
    const snapshot = await snapshotAnchor(thread, doc);
    invariant(snapshot, 'anchored document has a snapshot');

    updateText(
      text,
      ['content'],
      CONTENT.replace(PHRASE, '\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u304C\u56DE\u7B54\u3059\u308B'),
    );
    expect(anchoredText()).toBe('');

    restoreAnchor(snapshot);
    expect(anchoredText()).toBe('\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u304C\u56DE\u7B54\u3059\u308B');
  });

  test('an edit elsewhere leaves the anchor alone', async ({ expect }) => {
    const { doc, text, thread, anchoredText } = await setup();
    const snapshot = await snapshotAnchor(thread, doc);
    invariant(snapshot, 'anchored document has a snapshot');

    updateText(text, ['content'], CONTENT.replace('Comment threads', 'Threads'));
    restoreAnchor(snapshot);
    expect(anchoredText()).toBe(PHRASE);
  });

  test('a subject without a text anchor has no snapshot', async ({ expect }) => {
    const { thread } = await setup();
    expect(await snapshotAnchor(thread, Obj.make(Text.Text, { content: '' }))).toBeUndefined();
  });
});
