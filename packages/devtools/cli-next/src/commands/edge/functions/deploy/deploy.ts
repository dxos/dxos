//
// Copyright 2025 DXOS.org
//

import { Args, Command, Options } from '@effect/cli';
import { Effect, Option } from 'effect';

import { SpaceId } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { ClientService } from '../../../../services';
import { Common } from '../../../options';

import { loadScript, upload, uploadToSpace } from '../util';

const spaceId = Common.spaceId.pipe(Options.optional);

export const deploy = Command.make(
  'deploy',
  {
    file: Args.text({ name: 'file' }).pipe(Args.withDescription('The file to deploy.')),
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
    spaceId,
  },
  Effect.fn(function* ({ file, name, version, script, functionId, spaceId }) {
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
            functionId: Option.getOrUndefined(functionId),
            name: Option.getOrUndefined(name),
            version: Option.getOrUndefined(version),
            ownerPublicKey: identity.identityKey,
            bundledSource: bundledScript,
          }),
        onSome: (spaceId) =>
          uploadToSpace({
            functionId: Option.getOrUndefined(functionId),
            name: Option.getOrUndefined(name),
            version: Option.getOrUndefined(version),
            client,
            identity,
            spaceId,
            file,
            script,
            bundledScript,
            scriptFileContent,
          }),
      }),
    );
  }),
).pipe(Command.withDescription('Deploy a function to EDGE.'));
