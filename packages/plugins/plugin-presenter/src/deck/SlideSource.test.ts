//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Collection } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';

import { Presentation } from '#types';

import { toSlideSources } from './SlideSource.ts';

describe('toSlideSources', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [Presentation.Presentation, Text.Text, Markdown.Document, Collection.Collection],
    });
    return { db };
  };

  test('owned text, linked document and unresolved ref', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const doc = db.add(Markdown.make({ content: 'x' }));
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    const text = await presentation.sections[0].load();
    const sources = toSlideSources(presentation, [text, doc]);
    expect(sources.length).toBe(2);
    expect(sources[0]).toMatchObject({ kind: 'text', id: text.id });
    expect(sources[1]).toMatchObject({ kind: 'object', id: doc.id });
  });

  test('unresolved targets are pending and keep length', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a', 'b'] }));
    await db.flush({ indexes: true });
    const first = await presentation.sections[0].load();
    const sources = toSlideSources(presentation, [undefined, undefined]);
    expect(sources.map((source) => source.kind)).toEqual(['pending', 'pending']);
    expect(sources[0].id).toBe(first.id);
  });

  test('deleted targets are omitted', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const doc = db.add(Markdown.make({ content: 'x' }));
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    const text = await presentation.sections[0].load();
    db.remove(doc);
    const sources = toSlideSources(presentation, [text, doc]);
    expect(sources.map((source) => source.id)).toEqual([text.id]);
  });

  test('empty presentation', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make());
    expect(toSlideSources(presentation, [])).toEqual([]);
  });
});
