//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Spec from '@dxos/compute/Spec';
import { Database, Filter, Obj, Ref } from '@dxos/echo';

import { CodeOperation } from '#types';

import { CodeOperationError } from '../errors.ts';
import { recordReview } from './spec-review.ts';

/** The meta key source plugin-github's file sync keys repositories and the objects it imports with. */
const GITHUB_SOURCE = 'github.com';

const handler: Operation.WithHandler<typeof CodeOperation.ImportSpecReviewFile> =
  CodeOperation.ImportSpecReviewFile.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ repository, path, content }) {
        // File sync keys each object it imports `<repo id>:<path>`; the review's spec is the file beside it.
        const specPath = path.replace(/\.review\.mdl$/, '.mdl');
        const repo = yield* Database.load(repository);
        const repoId = Obj.getMeta(repo).keys.find(({ source }) => source === GITHUB_SOURCE)?.id;
        const isSpecKey = ({ source, id }: { source: string; id: string }) =>
          source === GITHUB_SOURCE && (repoId ? id === `${repoId}:${specPath}` : id.endsWith(`:${specPath}`));
        const spec = (yield* Database.query(Filter.type(Spec.Spec)).run.pipe(Effect.orDie)).find((spec) =>
          Obj.getMeta(spec).keys.some(isSpecKey),
        );
        if (!spec) {
          return yield* Effect.fail(new CodeOperationError({ message: `No synced spec for ${specPath}` }));
        }
        const { review } = yield* recordReview(spec, content);
        return { object: Ref.make(review), heads: Obj.version(review).automergeHeads ?? [] };
      }),
    ),
  );

export default handler;
