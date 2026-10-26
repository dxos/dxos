//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';

import * as Presentation from './Presentation.ts';
import * as PresentationMigration from './PresentationMigration.ts';

describe('presentation 0.1.0 → 0.2.0 migration', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('wraps each section in a slide, re-parents owned Text and lifts `hide: true`', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      PresentationMigration.LegacyPresentation,
      Presentation.Presentation,
      Presentation.Slide,
      Text.Text,
      Markdown.Document,
    ]);
    const shown = db.add(Text.make({ content: '# One' }));
    const hidden = db.add(Text.make({ content: '---\nhide: true\n---\n\n# Two' }));
    const doc = db.add(Markdown.make({ content: '# Linked' }));
    const legacy = db.add(
      Obj.make(PresentationMigration.LegacyPresentation, {
        name: 'Deck',
        sections: [Ref.make(shown), Ref.make(hidden), Ref.make(doc)],
      }),
    );
    Obj.setParent(shown, legacy);
    Obj.setParent(hidden, legacy);
    const id = legacy.id;
    await db.flush();

    await db.runMigrations([PresentationMigration.presentationMigration]);

    const [presentation] = await db.query(Filter.type(Presentation.Presentation)).run();
    expect(presentation.id).toBe(id);
    expect(presentation.name).toBe('Deck');
    const slides = await Promise.all(presentation.slides.map((ref) => ref.load()));
    expect(slides.map((slide) => slide.content.target?.id)).toEqual([shown.id, hidden.id, doc.id]);
    expect(slides.map((slide) => slide.hidden === true)).toEqual([false, true, false]);
    expect(slides.every((slide) => Obj.getParent(slide)?.id === id)).toBe(true);
    expect(Obj.getParent(shown)?.id).toBe(slides[0].id);
    expect(Obj.getParent(hidden)?.id).toBe(slides[1].id);
    expect(hidden.content).not.toContain('hide:');
    expect(Obj.getParent(doc)).toBeUndefined();
  });
});
