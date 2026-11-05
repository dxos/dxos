//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';
import { Annotation, Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Text } from '@dxos/schema';

import { SpecReviews } from '#sync';

import REVIEW from '../containers/SpecArticle/__fixtures__/plugin-code.review-2026-10-27.mdl?raw';
import createSpecReview from './create-spec-review.ts';

/** The review of 2026-10-27 with its front matter changed, as a later review of the same spec. */
const later = (date: string, commit: string) =>
  REVIEW.replace(/^date: .*$/m, `date: ${date}`).replace(/^commit: .*$/m, `commit: ${commit}`);

describe('CreateSpecReview', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Spec.Spec, SpecReview.SpecReview, Text.Text]);
    const spec = db.add(Spec.make({ name: 'plugin-code/PLUGIN.mdl' }));
    const record = (content: string) =>
      createSpecReview
        .handler({ spec: Ref.make(spec), content })
        .pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    const reviews = async () => (await db.query(SpecReview.query(spec)).run()).sort(SpecReview.byNewest);
    return { spec, record, reviews };
  };

  test("records the repository's review of plugin-code, owned by the spec", async ({ expect }) => {
    const { spec, record, reviews } = await setup();
    const { created } = await record(REVIEW);
    expect(created).toBe(true);

    const [review] = await reviews();
    expect(review).toMatchObject({ commit: '04d5fb15a8b5e81ebbabcfc78abdadb969765750', by: 'agent:claude-code' });
    expect(review.summary).toMatch(/^136 items: 29 done, 67 untested/);
    expect(Object.keys(review.verdicts)).toHaveLength(136);
    expect(review.verdicts['F-17.2']).toMatchObject({ status: 'untested' });
    expect(Obj.getParent(review)).toBe(spec);
    expect(
      Annotation.get(spec, SpecReview.ReviewsAnnotation).pipe(Option.map((refs) => refs.map(({ uri }) => uri))),
    ).toEqual(Option.some([Ref.make(review).uri]));
  });

  test('the same front matter replaces its review; new front matter adds one', async ({ expect }) => {
    const { record, reviews } = await setup();
    await record(REVIEW);
    const fixed = REVIEW.replace(/(verdict F-17\.2:[^\n]*\n  status: )\w+/, '$1missing');
    expect((await record(fixed)).created).toBe(false);
    expect(await reviews()).toHaveLength(1);
    expect((await reviews())[0].verdicts['F-17.2'].status).toBe('missing');

    const next = later('2026-11-05', 'fedcba9876543210');
    expect((await record(next.replace(/(verdict F-17\.2:[^\n]*\n  status: )\w+/, '$1diverged'))).created).toBe(true);
    // A time orders a second review of the same day after the first.
    const evening = later('2026-11-05T18:30Z', '0123456789abcdef');
    expect((await record(evening.replace(/(verdict F-17\.2:[^\n]*\n  status: )\w+/, '$1done'))).created).toBe(true);
    const history = await reviews();
    expect(history.map(({ date }) => date)).toEqual(['2026-11-05T18:30Z', '2026-11-05', '2026-10-27']);

    // The current status takes each item from the newest review that judges it.
    const current = SpecReviews.currentModel(history);
    const verdict = current?.verdicts.find(({ id }) => id === 'F-17.2');
    expect(verdict).toMatchObject({ status: 'done', review: { commit: '0123456789abcdef' } });
  });

  test('a review without its front matter, or with a date not written `YYYY-MM-DD`, is refused', async ({ expect }) => {
    const { record } = await setup();
    await expect(record(REVIEW.replace(/^---[\s\S]*?---\n/, ''))).rejects.toThrow(/front matter/);
    await expect(record(later('2026-11-5', 'fedcba9876543210'))).rejects.toThrow(/YYYY-MM-DD/);
    await expect(record(later('2026-11-05T18:30+01:00', 'fedcba9876543210'))).rejects.toThrow(/UTC time/);
    // Seconds would order `T18:30:30Z` before `T18:30Z` as text.
    await expect(record(later('2026-11-05T18:30:30Z', 'fedcba9876543210'))).rejects.toThrow(/UTC time/);
  });
});
