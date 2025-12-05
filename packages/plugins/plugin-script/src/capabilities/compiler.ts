//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import * as ts from 'typescript';

import { contributes } from '@dxos/app-framework';
import { runAndForwardErrors } from '@dxos/effect';
import { initializeBundler } from '@dxos/functions-runtime/bundler';
import { trim } from '@dxos/util';

import { Compiler } from '../compiler';

import { ScriptCapabilities } from './capabilities';

const SCRIPT_PACKAGES_BUCKET = 'https://pub-5745ae82e450484aa28f75fc6a175935.r2.dev/dev/';
const DECLARATION_EXTS = ['.d.ts', '.d.mts'];
const NO_TYPES = true; // Types temopararly disabled due to compiler erorrs.

export default async () => {
  await initializeBundler({ wasmUrl });

  const runtimeModules = await runAndForwardErrors(fetchRuntimeModules().pipe(Effect.provide(FetchHttpClient.layer)));

  const compiler = new Compiler({
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    noEmit: true,
    strict: true,
    esModuleInterop: true,
    paths: Object.fromEntries(runtimeModules.map((mod: any) => [mod.moduleName, [`./src/${mod.filename}`]])),
  });

  await compiler.initialize(trim`
    declare module 'https://*';
    ${NO_TYPES ? '' : 'declare module "*";'}
  `);
  if (!NO_TYPES) {
    for (const mod of runtimeModules) {
      compiler.setFile(`/src/${mod.filename}`, mod.content);
    }
  }

  return contributes(ScriptCapabilities.Compiler, compiler);
};

const fetchRuntimeModules = Effect.fnUntraced(function* () {
  const manifest = yield* HttpClient.get(new URL('manifest.json', SCRIPT_PACKAGES_BUCKET)).pipe(
    Effect.flatMap((_) => _.json),
    Effect.flatMap(Schema.decodeUnknown(Schema.Struct({ files: Schema.Array(Schema.String) }))),
  );

  const declarationFiles = manifest.files.filter((file) => DECLARATION_EXTS.some((ext) => file.endsWith(ext)));

  let fetched = 0;
  const modules = yield* Effect.forEach(
    declarationFiles,
    Effect.fnUntraced(
      function* (file) {
        const response = yield* HttpClient.get(new URL(file, SCRIPT_PACKAGES_BUCKET)).pipe(
          Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
        );
        const content = yield* response.text;
        fetched++;

        const moduleName = file.replace(/\.d\.(ts|mts)$/, '');
        return {
          moduleName,
          filename: file,
          content,
        };
      },
      Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
    ),
    { concurrency: 20 },
  );
  return modules;
});
