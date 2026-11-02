//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { formatSourceKey } from '@dxos/deus/review';
import * as FileSystem from '@dxos/plugin-file-system/FileSystem';

import { resolveRoots } from '#sync';
import { CodeOperation } from '#types';

import { CodeOperationError } from '../errors.ts';
import { configuredRepos } from './import-spec.ts';

const handler: Operation.WithHandler<typeof CodeOperation.ListLocalSpecs> = CodeOperation.ListLocalSpecs.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const fs = FileSystem.get();
      const roots = yield* resolveRoots(fs, yield* configuredRepos);
      const keys = yield* Effect.forEach(roots, (root) =>
        fs.list(root.path, '.mdl').pipe(
          Effect.mapError((cause) => new CodeOperationError({ cause })),
          Effect.map((paths) =>
            paths
              // Reviews are read with the spec beside them, and fixtures are test inputs, so neither is listed as a spec.
              .filter((path) => !path.endsWith('.review.mdl') && !/(^|\/)__fixtures__\//.test(path))
              .map((path) => {
                const [owner, repo] = root.repo.split('/');
                return formatSourceKey({ owner, repo, path });
              }),
          ),
        ),
      );
      return { roots, keys: keys.flat() };
    }),
  ),
);

export default handler;
