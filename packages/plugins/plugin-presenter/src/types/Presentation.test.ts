//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Collection, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';

import * as Presentation from './Presentation.ts';

describe('Presentation', () => {
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

  const contents = async (presentation: Presentation.Presentation) =>
    Promise.all(
      presentation.sections.map(async (ref) => {
        const target = await ref.load();
        return Obj.instanceOf(Text.Text, target) ? target.content : undefined;
      }),
    );

  test('make creates one owned Text per slide', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a', 'b'] }));
    await db.flush({ indexes: true });
    expect(presentation.sections.length).toBe(2);
    for (const ref of presentation.sections) {
      expect(Presentation.isOwned(presentation, await ref.load())).toBe(true);
    }
    expect(await contents(presentation)).toEqual(['a', 'b']);
  });

  test('link does not take ownership of an object with a parent', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make());
    const doc = db.add(Markdown.make({ content: 'x' }));
    db.add(Collection.make({ objects: [Ref.make(doc)] }));
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    expect(presentation.sections.length).toBe(1);
    expect(Presentation.isOwned(presentation, doc)).toBe(false);
  });

  test('link does not take ownership of a parentless non-Text object', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make());
    const doc = db.add(Markdown.make({ content: 'x' }));
    Presentation.link(presentation, doc);
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    expect(presentation.sections.length).toBe(1);
    expect(Presentation.isOwned(presentation, doc)).toBe(false);
  });

  test('remove deletes owned Text but keeps linked objects', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const doc = db.add(Markdown.make({ content: 'x' }));
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    const text = await presentation.sections[0].load();
    Presentation.remove(presentation, text);
    Presentation.remove(presentation, doc);
    await db.flush({ indexes: true });
    expect(presentation.sections.length).toBe(0);
    expect(await db.query(Filter.id(text.id)).run()).toHaveLength(0);
    expect(await db.query(Filter.id(doc.id)).run()).toHaveLength(1);
  });

  test('link of a parentless Text stays linked', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make());
    const text = db.add(Text.make({ content: 'x' }));
    Presentation.link(presentation, text);
    await db.flush({ indexes: true });
    expect(Presentation.isOwned(presentation, text)).toBe(false);
    expect(Obj.getParent(text)).toBeUndefined();
    Presentation.remove(presentation, text);
    await db.flush({ indexes: true });
    expect(presentation.sections.length).toBe(0);
    expect(await db.query(Filter.id(text.id)).run()).toHaveLength(1);
  });

  test('remove of a non-section is a no-op', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const other = db.add(Text.make({ content: 'x' }));
    Presentation.remove(presentation, other);
    await db.flush({ indexes: true });
    expect(presentation.sections.length).toBe(1);
    expect(await db.query(Filter.id(other.id)).run()).toHaveLength(1);
  });

  test('owned slides are parented to the presentation', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const added = Presentation.addSlide(presentation, 'b');
    expect(Obj.getParent(added)?.id).toBe(presentation.id);
    const first = await presentation.sections[0].load();
    expect(Obj.getParent(first)?.id).toBe(presentation.id);
  });

  test('addSlide at index inserts in order', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a', 'c'] }));
    Presentation.addSlide(presentation, 'b', 1);
    await db.flush({ indexes: true });
    expect(await contents(presentation)).toEqual(['a', 'b', 'c']);
  });

  test('move reorders sections', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a', 'b', 'c'] }));
    Presentation.move(presentation, 0, 2);
    await db.flush({ indexes: true });
    expect(await contents(presentation)).toEqual(['b', 'c', 'a']);
  });
});
