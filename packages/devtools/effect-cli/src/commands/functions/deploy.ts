//
// Copyright 2025 DXOS.org
//

import { Args, Command, Options } from '@effect/cli';
import { FileSystem } from '@effect/platform';
import { Console, Effect, Option } from 'effect';

import { type PublicKey } from '@dxos/client';
import { type FunctionType } from '@dxos/functions';
import { Bundler } from '@dxos/functions/bundler';
import { incrementSemverPatch, uploadWorkerFunction } from '@dxos/functions/edge';
import { invariant } from '@dxos/invariant';

import { ClientService } from '../../services';

const file = Args.text({ name: 'file' }).pipe(Args.withDescription('The file to deploy'));

const name = Options.text('name').pipe(Options.withDescription('The name of the function to deploy'), Options.optional);
const version = Options.text('version').pipe(
  Options.withDescription('The version of the function to deploy'),
  Options.optional,
);
const composerScript = Options.boolean('composerScript').pipe(
  Options.withDescription('Loads the script into composer.'),
  Options.optional,
);
const functionId = Options.text('functionId').pipe(
  Options.withDescription('Existing UserFunction ID to update.'),
  Options.optional,
);
const spaceKey = Options.text('spaceKey').pipe(
  Options.withDescription('Space key to create/update Script source in.'),
  Options.optional,
);

export const deploy = Command.make(
  'deploy',
  { file, name, version, composerScript, functionId, spaceKey },
  ({ file, name, version, composerScript, functionId, spaceKey }) =>
    Effect.gen(function* () {
      const { scriptFileContent, bundledScript } = yield* loadScript(file);

      const client = yield* ClientService;
      const identity = client.halo.identity.get();
      // TODO(wittjosiah): How to surface this error to the user?
      invariant(identity, 'Identity not available');

      if (Option.isNone(spaceKey)) {
        yield* upload({
          ownerPublicKey: identity.identityKey,
          bundledSource: bundledScript,
          functionId: Option.getOrUndefined(functionId),
          name: Option.getOrUndefined(name),
          version: Option.getOrUndefined(version),
        });
      }
    }),
);

const loadScript = Effect.fn(function* (path: string) {
  const fs = yield* FileSystem.FileSystem;
  let scriptFileContent: string | undefined;
  try {
    scriptFileContent = yield* fs.readFileString(path);
  } catch (err: any) {
    throw new Error(`Error reading file ${path}: ${err.message}`);
  }

  const bundleResult = yield* bundleScript(path);
  if (bundleResult.error || !bundleResult.bundle) {
    throw new Error(`Error bundling script ${path}: ${bundleResult.error?.message ?? 'empty output'}`);
  }

  return { scriptFileContent, bundledScript: bundleResult.bundle! };
});

const bundleScript = Effect.fn(function* (path: string) {
  const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
  const buildResult = yield* Effect.tryPromise(() => bundler.bundle({ path }));

  if (buildResult.error || !buildResult.bundle) {
    return { error: buildResult.error || new Error('Bundle creation failed') };
  }

  return { bundle: buildResult.bundle };
});

// TODO(wittjosiah): This is a mess, refactor.
const upload = Effect.fn(function* ({
  ownerPublicKey,
  bundledSource,
  functionId,
  fnObject,
  name,
  version,
}: {
  ownerPublicKey: PublicKey;
  bundledSource: string;
  functionId?: string;
  fnObject?: FunctionType;
  name?: string;
  version?: string;
}) {
  const client = yield* ClientService;
  const result = yield* Effect.tryPromise(() =>
    uploadWorkerFunction({
      client,
      ownerPublicKey,
      version: version ?? getNextVersion(fnObject),
      functionId,
      name,
      source: bundledSource,
    }),
  ).pipe(Effect.timeout(10_000));
  invariant(result.functionId, 'Upload failed.');
  yield* Console.log('Uploaded function', {
    functionId: result.functionId,
    version: result.version,
  });
  return result;
});

const getNextVersion = (fnObject: FunctionType | undefined) => {
  if (fnObject) {
    return incrementSemverPatch(fnObject?.version ?? '0.0.0');
  }

  return '0.0.1';
};
