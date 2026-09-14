//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { PROGRESS_STATUS_COMPLETE } from '@dxos/app-toolkit';
import { Database, Filter, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { PullRequest } from '@dxos/types';

import { Walkthrough } from '#types';

import { GENERATE_PHASES, generateWalkthrough } from './generate.ts';

const DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,1 +1,2 @@',
  ' keep();',
  '+added();',
  'diff --git a/src/b.ts b/src/b.ts',
  '--- a/src/b.ts',
  '+++ b/src/b.ts',
  '@@ -1,1 +1,2 @@',
  ' header();',
  '+extra();',
].join('\n');

/** What the model is asked to produce: prose plus an empty fence naming one file. */
const NARRATION = ['# A change', '', 'Prose about it.', '', '```diff file=src/a.ts', '```', ''].join('\n');

describe('generateWalkthrough', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([PullRequest.PullRequest, Walkthrough.Walkthrough]);
    const pullRequest = db.add(
      PullRequest.make({ owner: 'dxos', repo: 'dxos', number: 1, title: 'A change', state: 'open' }),
    );
    await db.flush();

    const phases: { message: string; current: number }[] = [];
    const run = (options: { commit?: string; force?: boolean; narration?: string } = {}) =>
      EffectEx.runPromise(
        generateWalkthrough({
          pullRequest,
          remote: { commit: options.commit ?? 'sha-1' },
          diff: DIFF,
          force: options.force,
          model: 'test-model',
          narrate: () => Effect.succeed(options.narration ?? NARRATION),
          report: (message, current) => phases.push({ message, current }),
        }).pipe(Effect.provide(Database.layer(db))),
      );

    return { db, pullRequest, phases, run };
  };

  test('creates a walkthrough, filling the chunk from the patch', async () => {
    const { run, pullRequest } = await setup();
    const result = await run();

    expect(result.generated).to.eq(true);
    expect(result.walkthrough.commit).to.eq('sha-1');
    expect(result.walkthrough.model).to.eq('test-model');
    expect(result.walkthrough.pullRequest.target).to.eq(pullRequest);
    // The fence was empty; the hunk comes from the diff, not from the model.
    expect(result.walkthrough.body).to.contain('+added();');
    expect(result.walkthrough.body).to.contain('@@ -1,1 +1,2 @@');
  });

  test('appends what the narration did not claim', async () => {
    const { run } = await setup();
    const result = await run();

    expect(result.covered).to.eq(1);
    expect(result.total).to.eq(2);
    expect(result.walkthrough.body).to.contain('## Also changed');
    expect(result.walkthrough.body).to.contain('+extra();');
  });

  test('returns the existing walkthrough unchanged for the same commit', async () => {
    const { run } = await setup();
    const first = await run();
    const second = await run({ narration: '# Different\n' });

    expect(second.generated).to.eq(false);
    expect(second.walkthrough).to.eq(first.walkthrough);
    expect(second.walkthrough.body).to.contain('# A change');
    expect(second.covered).to.eq(1);
  });

  test('regenerates when forced', async () => {
    const { run } = await setup();
    const first = await run();
    const second = await run({ force: true, narration: '# Rewritten\n' });

    expect(second.generated).to.eq(true);
    // The same object is replaced in place, so anything referring to it still resolves.
    expect(second.walkthrough).to.eq(first.walkthrough);
    expect(second.walkthrough.body).to.contain('# Rewritten');
  });

  test('regenerates when the head has moved', async () => {
    const { run } = await setup();
    await run();
    const second = await run({ commit: 'sha-2', narration: '# Newer\n' });

    expect(second.generated).to.eq(true);
    expect(second.walkthrough.commit).to.eq('sha-2');
    expect(second.walkthrough.body).to.contain('# Newer');
  });

  test('regenerates when no commit pins the existing one', async () => {
    const { run } = await setup();
    await run({ commit: '' });
    const second = await run({ commit: '', narration: '# Again\n' });

    // Without a head SHA the walkthrough cannot be shown to still describe the change.
    expect(second.generated).to.eq(true);
  });

  test('stores exactly one walkthrough per pull request', async () => {
    const { run, db } = await setup();
    await run();
    await run({ force: true });
    await run({ commit: 'sha-3' });

    const stored = await db.query(Filter.type(Walkthrough.Walkthrough)).run();
    expect(stored.length).to.eq(1);
  });

  test('resolves a duplicate written by a racing generation to the newest', async () => {
    const { db, pullRequest, run } = await setup();
    // Two generations racing both see none and both add; the reader has to converge on one of them.
    const older = db.add(
      Walkthrough.make({
        pullRequest: Ref.make(pullRequest),
        body: 'older',
        commit: 'sha-1',
        generatedAt: '2026-09-14T09:00:00.000Z',
      }),
    );
    const newer = db.add(
      Walkthrough.make({
        pullRequest: Ref.make(pullRequest),
        body: 'newer',
        commit: 'sha-1',
        generatedAt: '2026-09-14T10:00:00.000Z',
      }),
    );
    await db.flush();

    const result = await run();

    expect(result.generated).to.eq(false);
    expect(result.walkthrough.id).to.eq(newer.id);
    expect(result.walkthrough.id).not.to.eq(older.id);
  });

  test('orders duplicates by the instant, not by the spelling of the timestamp', async () => {
    const { db, pullRequest, run } = await setup();
    // `generatedAt` is an unvalidated date-time: as strings `+02:00` sorts above `Z`, as instants
    // 08:00Z is the older of the two.
    const offset = db.add(
      Walkthrough.make({
        pullRequest: Ref.make(pullRequest),
        body: 'offset',
        commit: 'sha-1',
        generatedAt: '2026-09-14T10:00:00+02:00',
      }),
    );
    const utc = db.add(
      Walkthrough.make({
        pullRequest: Ref.make(pullRequest),
        body: 'utc',
        commit: 'sha-1',
        generatedAt: '2026-09-14T09:00:00.000Z',
      }),
    );
    await db.flush();

    const result = await run();

    expect(result.walkthrough.id).to.eq(utc.id);
    expect(result.walkthrough.id).not.to.eq(offset.id);
  });

  test('reports its phases and ends on the completion sentinel', async () => {
    const { run, phases } = await setup();
    await run();

    expect(phases.map((phase) => phase.current)).to.deep.eq([3, 4, GENERATE_PHASES]);
    expect(phases.at(-1)?.message).to.eq(PROGRESS_STATUS_COMPLETE);
  });

  test('reports completion even when nothing was regenerated', async () => {
    const { run, phases } = await setup();
    await run();
    phases.length = 0;
    await run();

    // A meter with no terminal stays open forever and leaves the action disabled.
    expect(phases).to.deep.eq([{ message: PROGRESS_STATUS_COMPLETE, current: GENERATE_PHASES }]);
  });
});
