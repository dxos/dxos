//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Annotation, Collection, Filter, Obj, Ref, Type } from '@dxos/echo';
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
      types: [Presentation.Presentation, Presentation.Slide, Text.Text, Markdown.Document, Collection.Collection],
    });
    return { db };
  };

  const slidesOf = async (presentation: Presentation.Presentation) =>
    Promise.all(presentation.slides.map((ref) => ref.load()));

  const contents = async (presentation: Presentation.Presentation) =>
    Promise.all(
      (await slidesOf(presentation)).map(async (slide) => {
        const content = await slide.content.load();
        return Obj.instanceOf(Text.Text, content) ? content.content : undefined;
      }),
    );

  test('make creates one slide per string, each owning its Text', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a', 'b'], description: 'Deck' }));
    await db.flush({ indexes: true });
    expect(presentation.description).toBe('Deck');
    for (const slide of await slidesOf(presentation)) {
      expect(Obj.getParent(slide)?.id).toBe(presentation.id);
      expect(Presentation.isOwnedContent(slide, await slide.content.load())).toBe(true);
    }
    expect(await contents(presentation)).toEqual(['a', 'b']);
  });

  test('link adds a slide showing the object without owning it, once', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make());
    const doc = db.add(Markdown.make({ content: 'x' }));
    db.add(Collection.make({ objects: [Ref.make(doc)] }));
    Presentation.link(presentation, doc);
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    const [slide] = await slidesOf(presentation);
    expect(presentation.slides.length).toBe(1);
    expect(Presentation.isOwnedContent(slide, doc)).toBe(false);
    expect(Presentation.findSlide(presentation, doc)?.id).toBe(slide.id);
  });

  test('remove deletes the slide and its owned Text but keeps a linked object', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const doc = db.add(Markdown.make({ content: 'x' }));
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    const [owned, linked] = await slidesOf(presentation);
    const text = await owned.content.load();
    Presentation.remove(presentation, owned);
    Presentation.remove(presentation, doc);
    await db.flush({ indexes: true });
    expect(presentation.slides.length).toBe(0);
    expect(await db.query(Filter.id(text.id)).run()).toHaveLength(0);
    expect(await db.query(Filter.id(linked.id)).run()).toHaveLength(0);
    expect(await db.query(Filter.id(doc.id)).run()).toHaveLength(1);
  });

  test('deleting a presentation deletes its slides and spares linked objects', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const doc = db.add(Markdown.make({ content: 'linked' }));
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    const [owned] = await slidesOf(presentation);
    const text = await owned.content.load();

    db.remove(presentation);
    await db.flush({ indexes: true });
    expect(Obj.isDeleted(owned)).toBe(true);
    expect(Obj.isDeleted(text)).toBe(true);
    expect(Obj.isDeleted(doc)).toBe(false);
  });

  test('getPresentation reaches the presentation from a slide or its Text', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    await db.flush({ indexes: true });
    const [slide] = await slidesOf(presentation);
    const text = await slide.content.load();
    expect(Presentation.getPresentation(slide)?.id).toBe(presentation.id);
    expect(Presentation.getPresentation(text)?.id).toBe(presentation.id);
    expect(Presentation.getSlide(text)?.id).toBe(slide.id);
  });

  test('presentations are filed into collections', ({ expect }) => {
    expect(
      Annotation.UserType.get(Type.getSchema(Presentation.Presentation)).pipe(Option.getOrUndefined)?.tags,
    ).toContain(Collection.ItemTag);
  });

  test('remove of an object no slide shows is a no-op', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a'] }));
    const other = db.add(Text.make({ content: 'x' }));
    Presentation.remove(presentation, other);
    await db.flush({ indexes: true });
    expect(presentation.slides.length).toBe(1);
    expect(await db.query(Filter.id(other.id)).run()).toHaveLength(1);
  });

  test('addSlide at index inserts in order', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a', 'c'] }));
    const added = Presentation.addSlide(presentation, 'b', 1);
    await db.flush({ indexes: true });
    expect(Obj.getParent(added)?.id).toBe(presentation.id);
    expect(await contents(presentation)).toEqual(['a', 'b', 'c']);
  });

  test('move reorders slides', async ({ expect }) => {
    const { db } = await setup();
    const presentation = db.add(Presentation.make({ slides: ['a', 'b', 'c'] }));
    Presentation.move(presentation, 0, 2);
    await db.flush({ indexes: true });
    expect(await contents(presentation)).toEqual(['b', 'c', 'a']);
  });
});
