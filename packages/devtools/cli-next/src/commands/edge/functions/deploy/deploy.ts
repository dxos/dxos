//
// Copyright 2025 DXOS.org
//

import { Args, Command, Options } from '@effect/cli';
import { Effect, Option } from 'effect';

import { invariant } from '@dxos/invariant';

import { ClientService } from '../../../../services';
import { getSpace } from '../../../../util';
import { Common } from '../../../options';
import { createEdgeClient } from '../util';

import { bundle } from './bundle';

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
    const client = yield* ClientService;
    const identity = client.halo.identity.get();
    invariant(identity, 'Identity not available');

    const ownerPublicKey = yield* Option.match(options.spaceId, {
      onNone: () => Effect.succeed(identity.identityKey),
      onSome: (spaceId) => getSpace(spaceId).pipe(Effect.map((space) => space.key)),
    }).pipe(Effect.map((key) => key.toString()));

    const functionId = Option.getOrUndefined(options.functionId);
    const name = Option.getOrUndefined(options.name);
    const version = Option.getOrElse(options.version, () => '0.0.1');
    const { entryPoint, assets } = yield* bundle({ entryPoint: options.entryPoint });

    if (options.dryRun) {
      console.log('Dry run, not uploading function.');
      return;
    }

    const edgeClient = createEdgeClient(client);
    const res = yield* Effect.tryPromise(() =>
      edgeClient.uploadFunction({ functionId }, { ownerPublicKey, name, version, entryPoint, assets }),
    );
    console.log(JSON.stringify(res, null, 2));
  }),
  // Effect.fn(function* ({ file, name, version, script, functionId, spaceId }) {
  //   const { scriptFileContent, bundledScript } = yield* loadScript(file);

  //   const client = yield* ClientService;
  //   const identity = client.halo.identity.get();
  //   // TODO(wittjosiah): How to surface this error to the user?
  //   invariant(identity, 'Identity not available');

  //   yield* spaceId.pipe(
  //     // TODO(wittjosiah): Feedback about invalid space ID.
  //     Option.flatMap((spaceId) => (SpaceId.isValid(spaceId) ? Option.some(spaceId) : Option.none())),
  //     Option.match({
  //       onNone: () =>
  //         upload({
  //           functionId: Option.getOrUndefined(functionId),
  //           name: Option.getOrUndefined(name),
  //           version: Option.getOrUndefined(version),
  //           ownerPublicKey: identity.identityKey,
  //           bundledSource: bundledScript,
  //         }),
  //       onSome: (spaceId) =>
  //         uploadToSpace({
  //           functionId: Option.getOrUndefined(functionId),
  //           name: Option.getOrUndefined(name),
  //           version: Option.getOrUndefined(version),
  //           client,
  //           identity,
  //           spaceId,
  //           file,
  //           script,
  //           bundledScript,
  //           scriptFileContent,
  //         }),
  //     }),
  //   );
  // }),
).pipe(Command.withDescription('Deploy a function to EDGE.'));
