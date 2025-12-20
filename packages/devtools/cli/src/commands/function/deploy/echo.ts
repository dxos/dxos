//
// Copyright 2025 DXOS.org
//

import path from 'node:path';

import * as FileSystem from '@effect/platform/FileSystem';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import { Filter, type Space } from '@dxos/client/echo';
import { Database, Obj, Ref } from '@dxos/echo';
import { Function, Script, getUserFunctionIdInMetadata, setUserFunctionIdInMetadata } from '@dxos/functions';
import { incrementSemverPatch } from '@dxos/functions-runtime/edge';
import { type UploadFunctionResponseBody } from '@dxos/protocols';
import { Collection, Text } from '@dxos/schema';

import { CommandConfig } from '../../../services';

export const DATA_TYPES: Schema.Schema.AnyNoContext[] = [
  Function.Function,
  Script.Script,
  Collection.Collection,
  Text.Text,
];

export const getNextVersion = (fnObject: Option.Option<Function.Function>) => {
  return Option.match(fnObject, {
    onNone: () => '0.0.1',
    onSome: (fnObject) => incrementSemverPatch(fnObject.version),
  });
};

export const loadFunctionObject: (space: Space, functionId: string) => Effect.Effect<Function.Function, Error, never> =
  Effect.fn(function* (space: Space, functionId: string) {
    // TODO(wittjosiah): Derive Database.Service from ClientService.
    const functions = yield* Effect.tryPromise(() => space.db.query(Filter.type(Function.Function)).run());
    const functionObject = functions.find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === functionId);
    if (!functionObject) {
      return yield* Effect.fail(new Error(`Function ECHO object not found for ${functionId}`));
    }

    return functionObject;
  });

/**
 * @deprecated
 */
export const upsertFunctionObject: (opts: {
  space: Space;
  existingObject: Function.Function | undefined;
  uploadResult: UploadFunctionResponseBody;
  filePath: string;
  name?: string;
}) => Effect.Effect<Function.Function, never, CommandConfig> = Effect.fn(function* ({
  space,
  existingObject,
  uploadResult,
  filePath,
  name,
}) {
  const { verbose } = yield* CommandConfig;
  let functionObject;
  if (existingObject) {
    functionObject = existingObject;
  } else {
    functionObject = Function.make({
      name: path.basename(filePath, path.extname(filePath)),
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
  if (verbose) {
    yield* Console.log('Upserted function object', functionObject.id);
  }
  return functionObject;
});

const makeObjectNavigableInComposer = Effect.fn(function* (space: Space, obj: Obj.Any) {
  const collectionRef = space.properties['dxos.org/type/Collection'] as Ref.Ref<Collection.Collection> | undefined;
  if (collectionRef) {
    const collection = yield* Database.Service.load(collectionRef);
    if (collection) {
      collection.objects.push(Ref.make(obj));
    }
  }
});

export const upsertComposerScript = Effect.fn(function* ({
  space,
  functionObject,
  filePath,
  name,
}: {
  space: Space;
  functionObject: Function.Function;
  filePath: string;
  name?: string;
}) {
  const { verbose } = yield* CommandConfig;
  const fs = yield* FileSystem.FileSystem;
  const scriptFileContent = yield* fs.readFileString(filePath);
  const scriptFileName = name ?? path.basename(filePath, path.extname(filePath));

  if (functionObject.source) {
    const script = yield* Effect.tryPromise(() => functionObject.source!.load());
    const source = yield* Effect.tryPromise(() => script.source.load());
    source.content = scriptFileContent;
    if (verbose) {
      yield* Console.log('Updated composer script', script.id);
    }
  } else {
    const obj = yield* Database.Service.add(Script.make({ name: scriptFileName, source: scriptFileContent }));
    functionObject.source = Ref.make(obj);
    yield* makeObjectNavigableInComposer(space, obj);
    if (verbose) {
      yield* Console.log('Created composer script', obj.id);
    }
  }
});
