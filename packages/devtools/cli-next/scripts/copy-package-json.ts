// TODO(wittjosiah): Get the linter to stop ignoring this file.

import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as BunContext from '@effect/platform-bun/BunContext';
import * as Effect from 'effect/Effect';

import { runAndForwardErrors } from '@dxos/effect';

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* Effect.log('[Build] Copying package.json ...');
  const json: any = yield* fs.readFileString('package.json').pipe(Effect.map(JSON.parse));
  const pkg = {
    name: json.name,
    version: json.version,
    type: json.type,
    description: json.description,
    main: 'node_esm/bin.mjs',
    bin: {
      dx: 'node_esm/bin.mjs',
    },
    engines: json.engines,
    dependencies: json.dependencies,
    peerDependencies: json.peerDependencies,
    repository: json.repository,
    author: json.author,
    license: json.license,
    bugs: json.bugs,
    homepage: json.homepage,
    tags: json.tags,
    keywords: json.keywords,
  };
  yield* fs.writeFileString(path.join('dist', 'package.json'), JSON.stringify(pkg, null, 2));
  yield* Effect.log('[Build] Build completed.');
}).pipe(Effect.provide(BunContext.layer));

runAndForwardErrors(program).catch(console.error);
