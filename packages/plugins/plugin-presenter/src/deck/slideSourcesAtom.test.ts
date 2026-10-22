//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Collection } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';

import { Presentation } from '#types';

import { slideSourcesAtom } from './slideSourcesAtom.ts';

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
      types: [Presentation.Presentation, Text.Text, Markdown.Document, Collection.Collection],
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

  test('reorders when sections move', async ({ expect }) => {
    const { presentation, registry, atom } = await setup(['a', 'b']);
    const [first, second] = registry.get(atom).map((source) => source.id);
    Presentation.move(presentation, 0, 1);
    expect(registry.get(atom).map((source) => source.id)).toEqual([second, first]);
  });
});
