//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import * as FileSystem from '@dxos/plugin-file-system/FileSystem';
import { SpecDocument } from '@dxos/types';

import { formatSourceKey, getSpecKey, isSpecKey, parseSourceKey, resolvePath, resolveRoots, toMetaKey } from '#sync';
import { CodeCapabilities, CodeOperation } from '#types';

import { CodeOperationError } from '../errors.ts';

/** The configured checkouts, when the settings capability is up. */
export const configuredRepos = Effect.gen(function* () {
  const settings = yield* Capability.getOption(CodeCapabilities.Settings);
  const registry = yield* Capability.getOption(Capabilities.AtomRegistry);
  return Option.isSome(settings) && Option.isSome(registry) ? (registry.value.get(settings.value).repos ?? []) : [];
});

const handler: Operation.WithHandler<typeof CodeOperation.ImportSpec> = CodeOperation.ImportSpec.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ key: raw }) {
      const key = parseSourceKey(raw);
      if (!key || !isSpecKey(key)) {
        return yield* Effect.fail(new CodeOperationError({ message: `Not a spec key: ${raw}` }));
      }
      const name = formatSourceKey(key, false);

      const existing = (yield* Database.query(Filter.type(SpecDocument.SpecDocument)).run.pipe(Effect.orDie)).find(
        (spec) => {
          const linked = getSpecKey(spec);
          return linked !== undefined && formatSourceKey(linked, false) === name;
        },
      );
      if (existing) {
        return { spec: Ref.make(existing), created: false };
      }

      const fs = FileSystem.get();
      const roots = yield* resolveRoots(fs, yield* configuredRepos);
      const path = resolvePath(roots, key);
      if (!path) {
        return yield* Effect.fail(
          new CodeOperationError({
            message: `No local checkout of ${key.owner}/${key.repo}; add it in Code settings.`,
          }),
        );
      }
      const content = yield* fs.read(path).pipe(Effect.mapError((cause) => new CodeOperationError({ cause })));
      if (content === undefined) {
        return yield* Effect.fail(new CodeOperationError({ message: `File not found: ${path}` }));
      }

      const spec = SpecDocument.make({ name: key.path, content });
      Obj.update(spec, (spec) => {
        Obj.getMeta(spec).keys.push(toMetaKey(key));
      });
      const added = yield* Database.add(spec);
      return { spec: Ref.make(added), created: true };
    }),
  ),
);

export default handler;
