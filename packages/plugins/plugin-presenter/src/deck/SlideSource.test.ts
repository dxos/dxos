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
      types: [Presentation.Presentation, Presentation.Slide, Text.Text, Markdown.Document, Collection.Collection],
    });
    return { db };
  };

  const resolve = async (presentation: Presentation.Presentation) =>
    Promise.all(
      presentation.slides.map(async (ref) => {
        const slide = await ref.load();
        return { id: slide.id, slide, content: await slide.content.load() };
      }),
    );

  test('owned text and linked document', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const doc = db.add(Markdown.make({ content: 'x' }));
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    const resolved = await resolve(presentation);
    const sources = toSlideSources(resolved);
    expect(sources.length).toBe(2);
    expect(sources[0]).toMatchObject({ kind: 'text', id: resolved[0].slide.id });
    expect(sources[1]).toMatchObject({ kind: 'object', id: resolved[1].slide.id, object: doc });
  });

  test('a slide or content not loaded yet is pending and keeps its place', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a', 'b'] }));
    await db.flush({ indexes: true });
    const [first, second] = await resolve(presentation);
    const sources = toSlideSources([{ id: first.id }, { id: second.id, slide: second.slide }]);
    expect(sources.map((source) => source.kind)).toEqual(['pending', 'pending']);
    expect(sources[0].id).toBe(first.id);
  });

  test('a slide whose content was deleted is omitted', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const doc = db.add(Markdown.make({ content: 'x' }));
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    const resolved = await resolve(presentation);
    db.remove(doc);
    expect(toSlideSources(resolved).map((source) => source.id)).toEqual([resolved[0].id]);
  });

  test('empty presentation', ({ expect }) => {
    expect(toSlideSources([])).toEqual([]);
  });
});
