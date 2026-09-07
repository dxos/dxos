//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref, type Tag } from '@dxos/echo';

import { QaOperation, TestCase } from '#types';

import { findCase } from './util';

/**
 * Matching on the human key rather than the object id is what makes re-generating a plan from an
 * updated spec non-destructive: the same TestCase object is updated in place, so results in past
 * runs keep resolving to it.
 */
const handler: Operation.WithHandler<typeof QaOperation.SetCase> = QaOperation.SetCase.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ plan: planRef, key, title, description, steps, tags }) {
      const plan = yield* Database.load(planRef);
      const existing = yield* findCase(plan, key);
      if (existing) {
        Obj.update(existing, (existing) => {
          existing.title = title;
          existing.description = description;
          if (steps) {
            existing.steps = [...steps];
          }
        });

        applyTags(existing, tags);
        return { case: Ref.make(existing), created: false };
      }

      const created = yield* Database.add(TestCase.make({ key, title, description, steps: steps ? [...steps] : [] }));
      applyTags(created, tags);
      Obj.update(plan, (plan) => {
        plan.cases = [...plan.cases, Ref.make(created)];
      });

      return { case: Ref.make(created), created: true };
    }),
  ),
);

export default handler;

/** Tags live in the object's meta, so they are set there rather than as a field on the case. */
const applyTags = (testCase: TestCase.TestCase, tags: readonly Ref.Ref<Tag.Tag>[] | undefined): void => {
  if (!tags) {
    return;
  }

  const meta = Obj.getMeta(testCase);
  meta.tags = [...tags];
};
