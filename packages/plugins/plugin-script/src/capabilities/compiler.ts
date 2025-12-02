//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import * as ts from 'typescript';

import { contributes } from '@dxos/app-framework';
import { initializeBundler } from '@dxos/functions-runtime/bundler';
import { trim } from '@dxos/util';

import { Compiler } from '../compiler';

import { ScriptCapabilities } from './capabilities';

const SCRIPT_PACKAGES_BUCKET = 'https://pub-5745ae82e450484aa28f75fc6a175935.r2.dev';

const DECLARATION_EXTS = ['.d.ts', '.d.mts'];

export default async () => {
  const runtimeModules = await Effect.runPromise(fetchRuntimeModules().pipe(Effect.provide(FetchHttpClient.layer)));

  const compiler = new Compiler({
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    noEmit: true,
    strict: true,
    esModuleInterop: true,
    paths: Object.fromEntries(runtimeModules.map((mod) => [mod.moduleName, [`./src/${mod.filename}`]])),
  });

  await compiler.initialize();
  for (const mod of runtimeModules) {
    console.log('set', `/src/${mod.filename}`, `${mod.content.slice(0, 25)} ... (${mod.content.length} chars)`);
    compiler.setFile(`/src/${mod.filename}`, mod.content);
  }

  // TODO(wittjosiah): Fetch types for https modules.
  compiler.setFile(
    '/src/typings.d.ts',
    trim`
      declare module 'https://*';
    `,
  );

  await initializeBundler({ wasmUrl });

  return contributes(ScriptCapabilities.Compiler, compiler);
};

const fetchRuntimeModules = Effect.fnUntraced(function* () {
  const manifest = yield* HttpClient.get(new URL('manifest.json', SCRIPT_PACKAGES_BUCKET)).pipe(
    Effect.flatMap((_) => _.json),
    Effect.flatMap(Schema.decodeUnknown(Schema.Struct({ files: Schema.Array(Schema.String) }))),
  );

  const declarationFiles = manifest.files.filter((file) => DECLARATION_EXTS.some((ext) => file.endsWith(ext)));

  console.log('Declaration files:', declarationFiles.length);
  let fetched = 0;
  const modules = yield* Effect.forEach(
    declarationFiles,
    Effect.fnUntraced(function* (file) {
      const response = yield* HttpClient.get(new URL(file, SCRIPT_PACKAGES_BUCKET)).pipe(
        Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
      );
      const content = yield* response.text;
      fetched++;
      if (fetched % 10 === 0) {
        console.log(`Fetched ${fetched}/${declarationFiles.length} files`);
      }

      const moduleName = file.replace(/\.d\.(ts|mts)$/, '');
      return {
        moduleName,
        filename: file,
        content,
      };
    }),
    { concurrency: 20 },
  );
  console.log(`Finished fetching ${fetched} files`);
  return modules;
});
