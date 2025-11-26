//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { resolve } from 'node:path';

import { ClientService } from '@dxos/client';
import { Function, FUNCTIONS_META_KEY } from '@dxos/functions';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { invariant } from '@dxos/invariant';

import { CommandConfig } from '../../../../services';
import { waitForSync } from '../../../../util';
import { Common } from '../../../options';
import { Obj } from '@dxos/echo';

import { bundle } from './bundle';
import { DATA_TYPES, upsertComposerScript } from './echo';
import { parseOptions } from './options';
import { PublicKey } from '@dxos/keys';
import { existsSync, fstatSync } from 'node:fs';

export const deploy = Command.make(
  'deploy',
  {
    entryPoint: Args.file({ name: 'entryPoint' }).pipe(Args.withDescription('The file to deploy.')),
    // TODO(burdon): Human readable name?
    name: Options.text('name').pipe(Options.withDescription('The name of the function.'), Options.optional),
    version: Options.text('version').pipe(
      Options.withDescription('The version of the function to deploy.'),
      Options.optional,
    ),
    script: Options.boolean('script').pipe(
      Options.withDescription('Loads the script into composer.'),
      Options.withDefault(false),
    ),
    functionId: Options.text('function-id').pipe(
      Options.withDescription('Existing UserFunction ID to update.'),
      Options.optional,
    ),
    spaceId: Common.spaceId.pipe(Options.optional),
    dryRun: Options.boolean('dry-run').pipe(
      Options.withDescription('Do not upload, just build the function.'),
      Options.withDefault(false),
    ),
  },
  Effect.fn(function* (options) {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;
    client.addTypes(DATA_TYPES);
    const identity = client.halo.identity.get();
    invariant(identity, 'Identity not available');

    if (!existsSync(options.entryPoint)) {
      yield* Console.error(`File not found: ${options.entryPoint}`);
      process.exit(1);
    }

    const artifact = yield* bundle({ entryPoint: resolve(options.entryPoint) });

    if (options.dryRun) {
      yield* Console.log('Dry run, not uploading function.');
      return;
    }

    const { space, ownerPublicKey, functionId, existingObject, name, version } = yield* parseOptions(options);

    const functionsServiceClient = FunctionsServiceClient.fromClient(client);
    const func = yield* Effect.tryPromise(() =>
      functionsServiceClient.deploy({
        functionId,
        ownerPublicKey: PublicKey.fromHex(ownerPublicKey),
        name,
        version,
        entryPoint: artifact.entryPoint,
        assets: artifact.assets,
      }),
    );

    let functionObject: Function.Function;
    if (Option.isSome(existingObject)) {
      functionObject = existingObject.value;
      Function.setFrom(functionObject, func);
    } else if (Option.isSome(space)) {
      functionObject = space.value.db.add(func);
    } else {
      functionObject = func;
    }

    if (Option.isSome(space)) {
      yield* Effect.promise(() => space.value.db.flush({ indexes: true }));
    }

    if (options.script) {
      yield* space.pipe(
        Option.map((space) => upsertComposerScript({ space, functionObject, filePath: options.entryPoint, name })),
        Option.getOrElse(() => Effect.succeed(undefined)),
      );
    }

    if (json) {
      yield* Console.log(JSON.stringify(func, null, 2));
    } else {
      yield* Console.log('Function uploaded successfully!');
      yield* Console.log(`Key: ${func.key}`);
      yield* Console.log(`Version: ${func.version}`);
      yield* Console.log(`Function ID: ${Obj.getKeys(functionObject, FUNCTIONS_META_KEY).at(0)?.id}`);
    }

    yield* Option.match(space, {
      onNone: () => Effect.succeed(undefined),
      onSome: (space) => waitForSync(space),
    });
  }),
).pipe(Command.withDescription('Deploy a function to EDGE.'));
