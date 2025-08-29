//
// Copyright 2025 DXOS.org
//

import path from 'node:path';

import { FileSystem } from '@effect/platform';
import { Effect } from 'effect';

import { type Client, type PublicKey } from '@dxos/client';
import { Filter, type Space, type SpaceId, getMeta } from '@dxos/client/echo';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type Identity } from '@dxos/client/halo';
import { Obj, Ref } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import {
  FUNCTIONS_META_KEY,
  FunctionType,
  ScriptType,
  getUserFunctionIdInMetadata,
  setUserFunctionIdInMetadata,
} from '@dxos/functions';
import { Bundler } from '@dxos/functions/bundler';
import { incrementSemverPatch, uploadWorkerFunction } from '@dxos/functions/edge';
import { invariant } from '@dxos/invariant';
import { type UploadFunctionResponseBody } from '@dxos/protocols';
import { DataType } from '@dxos/schema';

import { ClientService } from '../../../services';
import { waitForSync } from '../../../util';

const DATA_TYPES = [FunctionType, ScriptType, DataType.Collection, DataType.Text];

export const loadScript = Effect.fn(function* (path: string) {
  const fs = yield* FileSystem.FileSystem;
  let scriptFileContent: string | undefined;
  // TODO(burdon): Use Effect.try?
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
export const upload = Effect.fn(function* ({
  functionId,
  name,
  version,
  ownerPublicKey,
  bundledSource,
  fnObject,
}: {
  functionId?: string;
  name?: string;
  version?: string;
  ownerPublicKey: PublicKey;
  bundledSource: string;
  fnObject?: FunctionType;
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

// TODO(wittjosiah): This was ported directly from the old CLI and is a mess, refactor.
export const uploadToSpace = Effect.fn(function* ({
  functionId,
  name,
  version,
  client,
  identity,
  spaceId,
  file,
  script,
  bundledScript,
  scriptFileContent,
}: {
  functionId?: string;
  name?: string;
  version?: string;
  client: Client;
  identity: Identity;
  spaceId: SpaceId;
  file: string;
  script: boolean;
  bundledScript: string;
  scriptFileContent: string;
}) {
  client.addTypes(DATA_TYPES);
  const space = client.spaces.get(spaceId);
  invariant(space, 'Space not found');
  yield* Effect.tryPromise(() => space.waitUntilReady());
  const existingFunctionObject = yield* loadFunctionObject(space, functionId);
  const uploadResult = yield* upload({
    ownerPublicKey: identity.identityKey,
    bundledSource: bundledScript,
    functionId,
    fnObject: existingFunctionObject,
    name,
    version,
  });
  const functionObject = yield* upsertFunctionObject({
    space,
    existingObject: existingFunctionObject,
    uploadResult,
    file,
    name,
  });

  if (script) {
    yield* upsertComposerScript({
      space,
      functionObject,
      scriptFileName: path.basename(file),
      scriptFileContent,
      name,
    });
  }

  yield* waitForSync(space);
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
  // TODO(wittjosiah): Derive DatabaseService from ClientService.
  const functions = yield* Effect.tryPromise(() => space.db.query(Filter.type(FunctionType)).run());
  return functions.objects.find((fn) => getUserFunctionIdInMetadata(getMeta(fn)) === functionId);
});

const loadFunctionObject = Effect.fn(function* (space: Space, functionId?: string) {
  const functionObject = yield* findFunctionByDeploymentId(space, functionId);
  if (!functionObject && functionId) {
    throw new Error(`Function ECHO object not found for ${functionId}`);
  }

  return functionObject;
});

const upsertFunctionObject = Effect.fn(function* ({
  space,
  existingObject,
  uploadResult,
  file,
  name,
}: {
  space: Space;
  existingObject: FunctionType | undefined;
  uploadResult: UploadFunctionResponseBody;
  file: string;
  name?: string;
}) {
  let functionObject = existingObject;
  if (!functionObject) {
    functionObject = Obj.make(FunctionType, {
      name: path.basename(file, path.extname(file)),
      version: uploadResult.version,
    });
    space.db.add(functionObject);
  }
  functionObject.key = uploadResult.meta.key ?? functionObject.key;
  functionObject.name = name ?? uploadResult.meta.name ?? functionObject.name;
  functionObject.version = uploadResult.version;
  functionObject.description = uploadResult.meta.description;
  functionObject.inputSchema = uploadResult.meta.inputSchema;
  functionObject.outputSchema = uploadResult.meta.outputSchema;
  setUserFunctionIdInMetadata(Obj.getMeta(functionObject), uploadResult.functionId);
  yield* Effect.log('Upserted function object', functionObject.id);
  return functionObject;
});

const makeObjectNavigableInComposer = Effect.fn(function* (space: Space, obj: Obj.Any) {
  const collectionRef = space.properties['dxos.org/type/Collection'] as Ref.Ref<DataType.Collection> | undefined;
  if (collectionRef) {
    const collection = yield* Effect.tryPromise(() => collectionRef.load());
    if (collection) {
      collection.objects.push(Ref.make(obj));
    }
  }
});

const upsertComposerScript = Effect.fn(function* ({
  space,
  functionObject,
  scriptFileName,
  scriptFileContent,
  name,
}: {
  space: Space;
  functionObject: FunctionType;
  scriptFileName: string;
  scriptFileContent: string;
  name?: string;
}) {
  if (functionObject.source) {
    const script = yield* Effect.tryPromise(() => functionObject.source!.load());
    const source = yield* Effect.tryPromise(() => script.source.load());
    source.content = scriptFileContent;
    yield* Effect.log('Updated composer script', script.id);
  } else {
    const sourceObj = space.db.add(DataType.makeText(scriptFileContent));
    const obj = space.db.add(Obj.make(ScriptType, { name: name ?? scriptFileName, source: Ref.make(sourceObj) }));
    functionObject.source = Ref.make(obj);
    yield* makeObjectNavigableInComposer(space, obj);
    yield* Effect.log('Created composer script', obj.id);
  }
});

export const createEdgeClient = (client: Client): EdgeHttpClient => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge is not configured.');
  const edgeClient = new EdgeHttpClient(edgeUrl);
  const edgeIdentity = createEdgeIdentity(client);
  edgeClient.setIdentity(edgeIdentity);
  return edgeClient;
};

export const getDeployedFunctions = async (client: Client): Promise<FunctionType[]> => {
  const edgeClient = createEdgeClient(client);

  const result = await edgeClient.listFunctions();
  return result.uploadedFunctions.map((record: any) => {
    // record shape is determined by EDGE API. We defensively parse.
    const latest = record.latestVersion ?? {};
    const versionMeta = safeJsonParse(latest.versionMetaJSON);

    const fn = Obj.make(FunctionType, {
      key: versionMeta?.key,
      name: versionMeta?.name ?? versionMeta?.key ?? record.id,
      version: latest?.version ?? '0.0.0',
      description: versionMeta?.description,
      inputSchema: versionMeta?.inputSchema,
      outputSchema: versionMeta?.outputSchema,
    });
    setUserFunctionIdInMetadata(Obj.getMeta(fn), record.id);

    return fn;
  });
};

// Local helper to avoid throwing on bad JSON from server.
const safeJsonParse = (value: unknown): any => {
  if (typeof value !== 'string' || value.length === 0) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

export const invokeFunction = async (
  edgeClient: EdgeHttpClient,
  fn: FunctionType,
  input: unknown,
  {
    spaceId,
    cpuTimeLimit,
    subrequestsLimit,
  }: { spaceId?: SpaceId; cpuTimeLimit?: number; subrequestsLimit?: number } = {},
) => {
  const functionId = Obj.getMeta(fn).keys.find((key) => key.source === FUNCTIONS_META_KEY)?.id;
  if (!functionId) {
    throw new Error('No identifier for the function at the EDGE service');
  }
  // COMPAT: Previously functionId was a URL `/<guid>`. Now it's just the `<guid>`.
  const cleanedId = functionId.replace(/^\//, '');
  return await edgeClient.invokeFunction({ functionId: cleanedId, spaceId, cpuTimeLimit, subrequestsLimit }, input);
};
