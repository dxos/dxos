//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as FileSystem from '@dxos/plugin-file-system/FileSystem';

import { formatSourceKey, resolveRoots } from '#sync';
import { CodeOperation } from '#types';

import { CodeOperationError } from '../errors.ts';
import { configuredRepos } from './import-spec.ts';

const handler: Operation.WithHandler<typeof CodeOperation.ListLocalSpecs> = CodeOperation.ListLocalSpecs.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const fs = FileSystem.get();
      const roots = yield* resolveRoots(fs, yield* configuredRepos);
      const confined = FileSystem.within(
        fs,
        roots.map((root) => root.path),
      );
      const keys = yield* Effect.forEach(roots, (root) =>
        confined.list(root.path, '.mdl').pipe(
          Effect.mapError((cause) => new CodeOperationError({ cause })),
          Effect.map((paths) =>
            paths
              // Reviews sit beside their spec; they are read with it rather than listed as specs.
              .filter((path) => !path.endsWith('.review.mdl'))
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
