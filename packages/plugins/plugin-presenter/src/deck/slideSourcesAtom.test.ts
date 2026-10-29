//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Collection, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';

import { Presentation } from '#types';

import { presentedPositionsAtom, slideSourcesAtom } from './slideSourcesAtom.ts';

describe('slideSourcesAtom', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async (slides: string[]) => {
    const { db } = await builder.createDatabase({
      types: [Presentation.Presentation, Presentation.Slide, Text.Text, Markdown.Document, Collection.Collection],
    });
    const presentation = db.add(Presentation.make({ slides }));
    await db.flush({ indexes: true });
    const registry = Registry.make();
    const atom = slideSourcesAtom(presentation);
    registry.subscribe(atom, () => {});
    return { db, presentation, registry, atom };
  };

  test('grows when a slide is added', async ({ expect }) => {
    const { presentation, registry, atom } = await setup(['a', 'b']);
    expect(registry.get(atom).length).toBe(2);
    Presentation.addSlide(presentation, 'c');
    const sources = registry.get(atom);
    expect(sources.length).toBe(3);
    expect(sources[2].kind).toBe('text');
  });

  test('omits a deleted linked document instead of leaving it pending', async ({ expect }) => {
    const { db, presentation, registry, atom } = await setup(['a', 'b']);
    const doc = db.add(Markdown.make({ content: 'x' }));
    Presentation.link(presentation, doc);
    await db.flush({ indexes: true });
    await expect.poll(() => registry.get(atom).map((source) => source.kind)).toEqual(['text', 'text', 'object']);
    db.remove(doc);
    await db.flush();
    await expect.poll(() => registry.get(atom).map((source) => source.kind)).toEqual(['text', 'text']);
  });

  test('omits a deleted owned slide', async ({ expect }) => {
    const { db, presentation, registry, atom } = await setup(['a', 'b']);
    const [, second] = registry.get(atom);
    const slide = await presentation.slides[0].load();
    db.remove(await slide.content.load());
    await db.flush();
    await expect.poll(() => registry.get(atom).map((source) => source.id)).toEqual([second.id]);
  });

  test('reorders when slides move', async ({ expect }) => {
    const { presentation, registry, atom } = await setup(['a', 'b']);
    const [first, second] = registry.get(atom).map((source) => source.id);
    Presentation.move(presentation, 0, 1);
    expect(registry.get(atom).map((source) => source.id)).toEqual([second, first]);
  });

  test('presented positions skip hidden slides and keep an object linked twice at both places', async ({ expect }) => {
    const { db, presentation, registry } = await setup(['a', 'b', 'c']);
    const hidden = await presentation.slides[1].load();
    Obj.update(hidden, (hidden) => {
      hidden.hidden = true;
    });
    const doc = db.add(Markdown.make({ content: 'x' }));
    const twice = [Presentation.makeSlide(doc), Presentation.makeSlide(doc)];
    Obj.update(presentation, (presentation) => {
      presentation.slides.push(...twice.map((slide) => Ref.make(slide)));
    });
    await db.flush({ indexes: true });
    const positions = presentedPositionsAtom(presentation);
    registry.subscribe(positions, () => {});
    await expect.poll(() => registry.get(positions)).toEqual([0, 2, 3, 4]);
  });
});
