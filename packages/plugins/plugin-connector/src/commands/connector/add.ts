//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';
import * as Prompt from 'effect/unstable/cli/Prompt';

import { CommandConfig } from '@dxos/cli-util';
import { flushAndSync, print, spaceLayer, withTypes } from '@dxos/cli-util';
import { Common } from '@dxos/cli-util';
import { Database, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';

import { ConnectorCommandError } from '../errors.ts';
import { performOAuthFlow } from './oauth.ts';
import { OAUTH_PRESETS, type OAuthPreset, printTokenAdded } from './util.ts';

export const add = Command.make(
  'add',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    preset: Options.String('preset').pipe(
      Options.withDescription('OAuth preset name (e.g., google)'),
      Options.optional,
    ),
    source: Options.String('source').pipe(Options.withDescription('Token source'), Options.optional),
    account: Options.String('account').pipe(
      Options.withDescription('Account associated with the token'),
      Options.optional,
    ),
    token: Options.String('token').pipe(Options.withDescription('Token value'), Options.optional),
  },
  ({ preset, source, account, token }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const hasPreset = Option.isSome(preset);
      const hasSource = Option.isSome(source);

      if (!hasPreset && !hasSource) {
        // Interactive mode
        const mode = yield* Prompt.Select({
          message: 'Choose connection type:',
          choices: [
            { title: 'Preset (OAuth)', value: 'preset' },
            { title: 'Custom Token', value: 'custom' },
          ],
        }).pipe(Prompt.run);

        if (mode === 'preset') {
          const selectedPreset = yield* selectPresetInteractively();
          yield* addOAuthPresetToken(selectedPreset, json);
        } else {
          const customTokenData = yield* promptForCustomToken();
          yield* addCustomToken(customTokenData, json);
        }
      } else if (hasPreset) {
        // Preset mode from command line
        const selectedPreset = yield* resolvePresetFromCommandLine(preset.value);
        yield* addOAuthPresetToken(selectedPreset, json);
      } else {
        // Custom token mode from command line
        const sourceValue = yield* Option.match(source, {
          onNone: () => Effect.fail(new ConnectorCommandError({ message: 'Source is required' })),
          onSome: (value) => Effect.succeed(value),
        });
        const tokenValue = yield* Option.match(token, {
          onNone: () => Effect.fail(new ConnectorCommandError({ message: 'Token is required when specifying source' })),
          onSome: (value) => Effect.succeed(value),
        });
        const customTokenData = {
          source: sourceValue,
          token: tokenValue,
          account: Option.getOrUndefined(account),
        };
        yield* addCustomToken(customTokenData, json);
      }

      yield* flushAndSync();
    }),
).pipe(
  Command.withDescription('Add a connection (OAuth or custom token).'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(AccessToken.AccessToken, Connection.Connection)),
);

//
// Helper functions
//

const selectPresetInteractively = Effect.fn(function* () {
  const presetChoices = OAUTH_PRESETS.map(({ label }) => ({ title: label, value: label }));
  const selectedLabel = yield* Prompt.Select({
    message: 'Select OAuth preset:',
    choices: presetChoices,
  }).pipe(Prompt.run);

  const preset = OAUTH_PRESETS.find((p) => p.label === selectedLabel);
  if (!preset) {
    return yield* Effect.fail(new ConnectorCommandError({ message: `Preset not found: ${selectedLabel}` }));
  }
  return preset;
});

const promptForCustomToken = Effect.fn(function* () {
  const source = yield* Prompt.String({
    message: 'Source:',
  }).pipe(Prompt.run);

  const account = yield* Prompt.String({
    message: 'Account (optional):',
  }).pipe(Prompt.run);

  const token = yield* Prompt.String({
    message: 'Token:',
  }).pipe(Prompt.run);

  return { source, account, token };
});

const resolvePresetFromCommandLine = (presetValue: string): Effect.Effect<OAuthPreset, Error> => {
  const preset = OAUTH_PRESETS.find((p) => p.label.toLowerCase() === presetValue.toLowerCase());
  if (!preset) {
    return Effect.fail(
      new ConnectorCommandError({
        message: `Preset not found: ${presetValue}. Available presets: ${OAUTH_PRESETS.map((p) => p.label).join(', ')}`,
      }),
    );
  }
  return Effect.succeed(preset);
};

const addOAuthPresetToken = Effect.fn(function* (preset: OAuthPreset, json: boolean) {
  const accessToken = Obj.make(AccessToken.AccessToken, {
    source: preset.source,
    token: '', // Will be populated by OAuth flow.
  });

  yield* performOAuthFlow(preset, accessToken);
  yield* Database.add(accessToken);
  yield* Database.add(
    Connection.make({ name: preset.label, connectorId: preset.source, accessToken: Ref.make(accessToken) }),
  );
  yield* printTokenResult(accessToken, json);
});

const addCustomToken = Effect.fn(function* (
  data: Pick<AccessToken.AccessToken, 'source' | 'token' | 'account'>,
  json: boolean,
) {
  if (!data.source || !data.token) {
    return yield* Effect.fail(
      new ConnectorCommandError({ message: 'Source and token are required for custom tokens' }),
    );
  }

  const accessToken = Obj.make(AccessToken.AccessToken, {
    source: data.source,
    token: data.token,
    account: data.account,
  });

  yield* Database.add(accessToken);
  yield* Database.add(
    Connection.make({
      name: data.account ?? data.source,
      connectorId: data.source,
      accessToken: Ref.make(accessToken),
    }),
  );
  yield* printTokenResult(accessToken, json);
});

const printTokenResult = Effect.fn(function* (accessToken: AccessToken.AccessToken, json: boolean) {
  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          id: accessToken.id,
          source: accessToken.source,
          account: accessToken.account,
        },
        null,
        2,
      ),
    );
  } else {
    yield* Console.log(print(printTokenAdded(accessToken.source)));
  }
});
