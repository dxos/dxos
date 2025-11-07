//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type Function } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';

import { ClientService, CommandConfig } from '../../../../services';
import { waitForSync } from '../../../../util';
import { Common } from '../../../options';
import { createEdgeClient } from '@dxos/functions-runtime/edge';

import { bundle } from './bundle';
import { DATA_TYPES, upsertComposerScript, upsertFunctionObject } from './echo';
import { parseOptions } from './options';

export const deploy = Command.make(
  'deploy',
  {
    entryPoint: Args.text({ name: 'entryPoint' }).pipe(Args.withDescription('The file to deploy.')),
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

    const { entryPoint, assets } = yield* bundle({ entryPoint: options.entryPoint });

    if (options.dryRun) {
      yield* Console.log('Dry run, not uploading function.');
      return;
    }

    const { space, ownerPublicKey, functionId, existingObject, name, version } = yield* parseOptions(options);

    const edgeClient = createEdgeClient(client);
    const uploadResult = yield* Effect.tryPromise(() =>
      edgeClient.uploadFunction({ functionId }, { ownerPublicKey, name, version, entryPoint, assets }),
    );

    const functionObject = yield* Option.all([space, existingObject]).pipe(
      Option.map(([space, existingObject]) =>
        upsertFunctionObject({
          space,
          existingObject,
          uploadResult,
          filePath: options.entryPoint,
          name,
        }).pipe(Effect.map(Option.some)),
      ),
      Option.getOrElse(() => Effect.succeed(Option.none<Function.Function>())),
    );

    if (options.script) {
      yield* Option.all([space, functionObject]).pipe(
        Option.map(([space, functionObject]) =>
          upsertComposerScript({ space, functionObject, filePath: options.entryPoint, name }),
        ),
        Option.getOrElse(() => Effect.succeed(undefined)),
      );
    }

    if (json) {
      yield* Console.log(JSON.stringify(uploadResult, null, 2));
    } else {
      yield* Console.log('Function uploaded successfully!');
      yield* Console.log(`Function ID: ${uploadResult.functionId}`);
      yield* Console.log(`Version: ${uploadResult.version}`);
    }

    yield* Option.match(space, {
      onNone: () => Effect.succeed(undefined),
      onSome: (space) => waitForSync(space),
    });
  }),
).pipe(Command.withDescription('Deploy a function to EDGE.'));
