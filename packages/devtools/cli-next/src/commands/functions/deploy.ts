//
// Copyright 2025 DXOS.org
//

import path from 'node:path';

import { Args, Command, Options } from '@effect/cli';
import { FileSystem } from '@effect/platform';
import { Effect, Option } from 'effect';

import { type Client, type PublicKey } from '@dxos/client';
import { type AnyLiveObject, Filter, type Space, SpaceId, getMeta } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import {
  FunctionType,
  ScriptType,
  getUserFunctionUrlInMetadata,
  makeFunctionUrl,
  setUserFunctionUrlInMetadata,
} from '@dxos/functions';
import { Bundler } from '@dxos/functions/bundler';
import { incrementSemverPatch, uploadWorkerFunction } from '@dxos/functions/edge';
import { invariant } from '@dxos/invariant';
import { type UploadFunctionResponseBody } from '@dxos/protocols';
import { DataType } from '@dxos/schema';

import { ClientService } from '../../services';
import { waitForSync } from '../../util';

const file = Args.text({ name: 'file' }).pipe(Args.withDescription('The file to deploy'));

const name = Options.text('name').pipe(
  Options.withDescription('The name of the function to deploy.'),
  Options.optional,
);
const version = Options.text('version').pipe(
  Options.withDescription('The version of the function to deploy.'),
  Options.optional,
);
const spaceId = Options.text('spaceId').pipe(
  Options.withDescription('Space key to create/update Script source in.'),
  Options.optional,
);
const functionId = Options.text('functionId').pipe(
  Options.withDescription('Existing UserFunction ID to update.'),
  Options.optional,
);
const composerScript = Options.boolean('composerScript').pipe(
  Options.withDescription('Loads the script into composer.'),
  Options.withDefault(false),
);

export const deployFunction = Effect.fn(function* ({
  file,
  name,
  version,
  composerScript,
  functionId,
  spaceId,
}: {
  file: string;
  name: Option.Option<string>;
  version: Option.Option<string>;
  composerScript: boolean;
  functionId: Option.Option<string>;
  spaceId: Option.Option<string>;
}) {
  const { scriptFileContent, bundledScript } = yield* loadScript(file);

  const client = yield* ClientService;
  const identity = client.halo.identity.get();
  // TODO(wittjosiah): How to surface this error to the user?
  invariant(identity, 'Identity not available');

  yield* spaceId.pipe(
    // TODO(wittjosiah): Feedback about invalid space ID.
    Option.flatMap((spaceId) => (SpaceId.isValid(spaceId) ? Option.some(spaceId) : Option.none())),
    Option.match({
      onNone: () =>
        upload({
          ownerPublicKey: identity.identityKey,
          bundledSource: bundledScript,
          functionId: Option.getOrUndefined(functionId),
          name: Option.getOrUndefined(name),
          version: Option.getOrUndefined(version),
        }),
      onSome: (spaceId) =>
        // TODO(wittjosiah): This was ported directly from the old CLI and is a mess, refactor.
        Effect.gen(function* () {
          const space = client.spaces.get(spaceId);
          invariant(space, 'Space not found');
          yield* Effect.tryPromise(() => space.waitUntilReady());
          const existingFunctionObject = yield* loadFunctionObject(space, Option.getOrUndefined(functionId));
          const uploadResult = yield* upload({
            ownerPublicKey: identity.identityKey,
            bundledSource: bundledScript,
            functionId: Option.getOrUndefined(functionId),
            fnObject: existingFunctionObject,
            name: Option.getOrUndefined(name),
            version: Option.getOrUndefined(version),
          });
          const functionObject = yield* upsertFunctionObject({
            client,
            space,
            existingObject: existingFunctionObject,
            uploadResult,
            file,
            name: Option.getOrUndefined(name),
          });
          if (composerScript) {
            yield* upsertComposerScript({
              client,
              space,
              functionObject,
              scriptFileName: path.basename(file),
              scriptFileContent,
              name: Option.getOrUndefined(name),
            });
          }
          yield* waitForSync(space);
        }),
    }),
  );
});

export const deploy = Command.make(
  'deploy',
  { file, name, version, composerScript, functionId, spaceId },
  deployFunction,
).pipe(Command.withDescription('Deploy a function to EDGE.'));

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

// TODO(wittjosiah): Align with plugin-script.
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
  yield* Effect.log('Uploaded function', {
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

const findFunctionByDeploymentId = Effect.fn(function* (space: Space, functionId?: string) {
  if (!functionId) {
    return undefined;
  }
  const invocationUrl = makeFunctionUrl({ functionId });
  // TODO(wittjosiah): Derive DatabaseService from ClientService.
  const functions = yield* Effect.tryPromise(() => space.db.query(Filter.type(FunctionType)).run());
  return functions.objects.find((fn) => getUserFunctionUrlInMetadata(getMeta(fn)) === invocationUrl);
});

const loadFunctionObject = Effect.fn(function* (space: Space, functionId?: string) {
  const functionObject = yield* findFunctionByDeploymentId(space, functionId);
  if (!functionObject && functionId) {
    throw new Error(`Function ECHO object not found for ${functionId}`);
  }

  return functionObject;
});

const upsertFunctionObject = Effect.fn(function* ({
  client,
  space,
  existingObject,
  uploadResult,
  file,
  name,
}: {
  client: Client;
  space: Space;
  existingObject: FunctionType | undefined;
  uploadResult: UploadFunctionResponseBody;
  file: string;
  name?: string;
}) {
  client.addTypes([FunctionType]);

  let functionObject = existingObject;
  if (!functionObject) {
    functionObject = Obj.make(FunctionType, {
      name: path.basename(file, path.extname(file)),
      version: uploadResult.version,
    });
    space.db.add(functionObject);
  }
  functionObject.name = name ?? functionObject.name;
  functionObject.version = uploadResult.version;
  functionObject.description = uploadResult.meta.description;
  functionObject.inputSchema = uploadResult.meta.inputSchema;
  functionObject.outputSchema = uploadResult.meta.outputSchema;
  setUserFunctionUrlInMetadata(Obj.getMeta(functionObject), makeFunctionUrl(uploadResult));
  yield* Effect.log('Upserted function object', functionObject.id);
  return functionObject;
});

const makeObjectNavigableInComposer = Effect.fn(function* (client: Client, space: Space, obj: AnyLiveObject<any>) {
  const collectionRef = space.properties['dxos.org/type/Collection'] as Ref.Ref<DataType.Collection> | undefined;
  if (collectionRef) {
    client.addTypes([DataType.Collection]);
    const collection = yield* Effect.tryPromise(() => collectionRef.load());
    if (collection) {
      collection.objects.push(Ref.make(obj));
    }
  }
});

const upsertComposerScript = Effect.fn(function* ({
  client,
  space,
  functionObject,
  scriptFileName,
  scriptFileContent,
  name,
}: {
  client: Client;
  space: Space;
  functionObject: FunctionType;
  scriptFileName: string;
  scriptFileContent: string;
  name?: string;
}) {
  client.addTypes([ScriptType, DataType.Text]);

  if (functionObject.source) {
    const script = yield* Effect.tryPromise(() => functionObject.source!.load());
    const source = yield* Effect.tryPromise(() => script.source.load());
    source.content = scriptFileContent;
    yield* Effect.log('Updated composer script', script.id);
  } else {
    const sourceObj = space.db.add(DataType.makeText(scriptFileContent));
    const obj = space.db.add(Obj.make(ScriptType, { name: name ?? scriptFileName, source: Ref.make(sourceObj) }));
    functionObject.source = Ref.make(obj);
    yield* makeObjectNavigableInComposer(client, space, obj);
    yield* Effect.log('Created composer script', obj.id);
  }
});
