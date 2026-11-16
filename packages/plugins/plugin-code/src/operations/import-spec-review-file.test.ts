//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';
import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Text } from '@dxos/schema';
import { Repo } from '@dxos/types';

import REVIEW from '../containers/SpecArticle/__fixtures__/plugin-code.review-2026-10-27.mdl?raw';
import importSpecReviewFile from './import-spec-review-file.ts';

const SPEC_PATH = 'packages/plugins/plugin-code/PLUGIN.mdl';
const REVIEW_PATH = 'packages/plugins/plugin-code/PLUGIN.review.mdl';

describe('ImportSpecReviewFile (plugin-github spec/FILE-SYNC.mdl F-1.4)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Repo.Repo, Spec.Spec, SpecReview.SpecReview, Text.Text]);
    const repo = db.add(Repo.make({ owner: 'dxos', name: 'dxos' }));
    Obj.update(repo, (repo) => {
      Obj.getMeta(repo).keys.push({ source: 'github.com', id: '1234' });
    });
    const run = <A, E>(effect: Effect.Effect<A, E, Database.Service>) =>
      effect.pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    return { db, repo, run };
  };

  test('records the review against the spec file sync imported beside it', async ({ expect }) => {
    const { db, repo, run } = await setup();
    const spec = db.add(Spec.make({ name: 'plugin-code/PLUGIN.mdl' }));
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push({ source: 'github.com', id: `1234:${SPEC_PATH}` });
    });

    const { object } = await run(
      importSpecReviewFile.handler({ repository: Ref.make(repo), path: REVIEW_PATH, content: REVIEW }),
    );
    const review = await run(Database.load(object));
    expect(SpecReview.instanceOf(review) && review.spec.uri).toBe(Ref.make(spec).uri);
  });

  test('a review whose spec is not synced, or whose repository has no GitHub id, is refused', async ({ expect }) => {
    const { db, repo, run } = await setup();
    await expect(
      run(importSpecReviewFile.handler({ repository: Ref.make(repo), path: REVIEW_PATH, content: REVIEW })),
    ).rejects.toThrow(/No synced spec/);

    // A spec of another repository at the same path is not this review's.
    const other = db.add(Repo.make({ owner: 'dxos', name: 'other' }));
    const spec = db.add(Spec.make({ name: 'plugin-code/PLUGIN.mdl' }));
    Obj.update(spec, (spec) => {
      Obj.getMeta(spec).keys.push({ source: 'github.com', id: `5678:${SPEC_PATH}` });
    });
    await expect(
      run(importSpecReviewFile.handler({ repository: Ref.make(other), path: REVIEW_PATH, content: REVIEW })),
    ).rejects.toThrow(/No GitHub id/);
  });
});
