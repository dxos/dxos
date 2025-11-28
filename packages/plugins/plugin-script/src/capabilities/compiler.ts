//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';

import { contributes } from '@dxos/app-framework';
import { initializeBundler } from '@dxos/functions-runtime/bundler';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Schema from 'effect/Schema';

import { Compiler } from '../compiler';

import { ScriptCapabilities } from './capabilities';
import * as Effect from 'effect/Effect';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Schedule from 'effect/Schedule';
import { trim } from '@dxos/util';

const SCRIPT_PACKAGES_BUCKET = 'https://pub-5745ae82e450484aa28f75fc6a175935.r2.dev';

const DECLARATION_EXTS = ['.d.ts', '.d.mts'];

export default async () => {
  const compiler = new Compiler({
    paths: {
      effect: ['./src/effect'],
    },
  });

  await compiler.initialize();
  // TODO(wittjosiah): Fetch types for https modules.
  compiler.setFile(
    '/src/typings.d.ts',
    trim`
      declare module 'https://*';

      declare module "effect" { export * from './effect.d.mts'; }
      declare module "effect/Schema" { export * from './effect/Schema.d.mts'; }
    `,
  );
  // TODO(wittjosiah): Proper function handler types.
  // TODO(wittjosiah): Remove.
  compiler.setFile(
    '/src/runtime.ts',
    `
      export const Filter: any = {};
      export type FunctionHandler = ({ event, context }: { event: any; context: any }) => Promise<Response>;
      export const functionHandler = (handler: FunctionHandler) => handler;
    `,
  );

  await Effect.runPromise(
    Effect.gen(function* () {
      const manifest = yield* HttpClient.get(new URL('manifest.json', SCRIPT_PACKAGES_BUCKET)).pipe(
        Effect.flatMap((_) => _.json),
        Effect.flatMap(Schema.decodeUnknown(Schema.Struct({ files: Schema.Array(Schema.String) }))),
      );

      const declarationFiles = manifest.files.filter((file) => DECLARATION_EXTS.some((ext) => file.endsWith(ext)));

      console.log('Declaration files:', declarationFiles.length);
      let fetched = 0;
      yield* Effect.forEach(
        declarationFiles,
        Effect.fnUntraced(function* (file) {
          const response = yield* HttpClient.get(new URL(file, SCRIPT_PACKAGES_BUCKET)).pipe(
            Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
          );
          const content = yield* response.text;
          console.log('set', `src/${file}`, content.slice(0, 25));
          compiler.setFile(`src/${file}`, content);
          fetched++;
          if (fetched % 10 === 0) {
            console.log(`Fetched ${fetched}/${declarationFiles.length} files`);
          }
        }),
        { concurrency: 20 },
      );
      console.log(`Finished fetching ${fetched} files`);
    }).pipe(Effect.provide(FetchHttpClient.layer)),
  );
  await initializeBundler({ wasmUrl });

  return contributes(ScriptCapabilities.Compiler, compiler);
};
