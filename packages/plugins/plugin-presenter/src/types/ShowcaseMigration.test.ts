//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Feature from '@dxos/plugin-projects/Feature';
import * as LegacyShowcase from '@dxos/plugin-projects/LegacyShowcase';
import * as Showcase from '@dxos/plugin-projects/Showcase';
import { Text } from '@dxos/schema';
import { PullRequest } from '@dxos/types';

import * as Presentation from './Presentation.ts';
import { makeShowcaseMigration } from './ShowcaseMigration.ts';

describe('showcase → presentation migration', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const seed = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      LegacyShowcase.Showcase,
      LegacyShowcase.Demonstrates,
      Showcase.Demonstrates,
      Presentation.Presentation,
      Presentation.Slide,
      Feature.Feature,
      PullRequest.PullRequest,
      Text.Text,
    ]);
    const feature = db.add(Feature.make({ name: 'Compose', status: 'operational' }));
    const pullRequest = db.add(
      PullRequest.make({ owner: 'dxos', repo: 'dxos', number: 1, title: 'Send', state: 'open' }),
    );
    const content = db.add(Text.make({ content: '# Sending a reply' }));
    const legacy = db.add(
      Obj.make(LegacyShowcase.Showcase, {
        name: 'Sending a reply',
        content: Ref.make(content),
        artifacts: [Ref.make(pullRequest)],
      }),
    );
    Obj.setParent(content, legacy);
    db.add(Relation.make(LegacyShowcase.Demonstrates, { [Relation.Source]: legacy, [Relation.Target]: feature }));
    await db.flush();
    return { db, feature, pullRequest, content, id: legacy.id };
  };

  // Each plugin contributes its own migration, so either may run first.
  for (const [order, migrations] of [
    ['deck first', [makeShowcaseMigration(), Showcase.demonstratesMigration]],
    ['relation first', [Showcase.demonstratesMigration, makeShowcaseMigration()]],
  ] as const) {
    test(`the showcase becomes a deck in place and its Demonstrates edges follow it (${order})`, async ({ expect }) => {
      const { db, feature, pullRequest, content, id } = await seed();

      await db.runMigrations([...migrations]);

      const [presentation] = await db.query(Filter.type(Presentation.Presentation)).run();
      expect(presentation.id).toBe(id);
      expect(presentation.name).toBe('Sending a reply');
      const slides = await Promise.all(presentation.slides.map((ref) => ref.load()));
      expect(slides.map((slide) => slide.content.target?.id)).toEqual([content.id, pullRequest.id]);
      expect(slides.every((slide) => Obj.getParent(slide)?.id === id)).toBe(true);
      expect(Presentation.isOwnedContent(slides[0], content)).toBe(true);
      expect(Obj.getParent(pullRequest)).toBeUndefined();

      expect(await db.query(Filter.type(LegacyShowcase.Demonstrates)).run()).toHaveLength(0);
      const shown = await db.query(Query.select(Filter.id(feature.id)).targetOf(Showcase.Demonstrates).source()).run();
      expect(shown.map((source) => source.id)).toEqual([id]);
      expect(Obj.instanceOf(Presentation.Presentation, shown[0])).toBe(true);
    });
  }
});
