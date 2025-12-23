//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { flushAndSync, print, spaceLayer, withTypes } from '@dxos/cli-util';
import { Common } from '@dxos/cli-util';
import { Obj } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

import { performOAuthFlow } from './oauth';
import { OAUTH_PRESETS, type OAuthPreset, printTokenAdded } from './util';

export const add = Command.make(
  'add',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    preset: Options.text('preset').pipe(Options.withDescription('OAuth preset name (e.g., google)'), Options.optional),
    source: Options.text('source').pipe(Options.withDescription('Token source'), Options.optional),
    token: Options.text('token').pipe(Options.withDescription('Token value'), Options.optional),
    note: Options.text('note').pipe(Options.withDescription('Token note/description'), Options.optional),
  },
  ({ preset, source, token, note }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const hasPreset = Option.isSome(preset);
      const hasSource = Option.isSome(source);

      if (!hasPreset && !hasSource) {
        // Interactive mode
        const mode = yield* Prompt.select({
          message: 'Choose integration type:',
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
          onNone: () => Effect.fail(new Error('Source is required')),
          onSome: (value) => Effect.succeed(value),
        });
        const tokenValue = yield* Option.match(token, {
          onNone: () => Effect.fail(new Error('Token is required when specifying source')),
          onSome: (value) => Effect.succeed(value),
        });
        const customTokenData = {
          source: sourceValue,
          token: tokenValue,
          note: Option.getOrUndefined(note),
        };
        yield* addCustomToken(customTokenData, json);
      }

      yield* flushAndSync();
    }),
).pipe(
  Command.withDescription('Add an integration (OAuth token or custom token).'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(AccessToken.AccessToken)),
);

//
// Helper functions
//

const selectPresetInteractively = Effect.fn(function* () {
  const presetChoices = OAUTH_PRESETS.map((p) => ({
    title: `${p.label} - ${p.note}`,
    value: p.label,
  }));
  const selectedLabel = yield* Prompt.select({
    message: 'Select OAuth preset:',
    choices: presetChoices,
  }).pipe(Prompt.run);

  const preset = OAUTH_PRESETS.find((p) => p.label === selectedLabel);
  if (!preset) {
    return yield* Effect.fail(new Error(`Preset not found: ${selectedLabel}`));
  }
  return preset;
});

const promptForCustomToken = Effect.fn(function* () {
  const source = yield* Prompt.text({
    message: 'Source:',
  }).pipe(Prompt.run);

  const token = yield* Prompt.text({
    message: 'Token:',
  }).pipe(Prompt.run);

  const note = yield* Prompt.text({
    message: 'Note (optional):',
  }).pipe(Prompt.run);

  return { source, token, note };
});

const resolvePresetFromCommandLine = (presetValue: string): Effect.Effect<OAuthPreset, Error> => {
  const preset = OAUTH_PRESETS.find((p) => p.label.toLowerCase() === presetValue.toLowerCase());
  if (!preset) {
    return Effect.fail(
      new Error(`Preset not found: ${presetValue}. Available presets: ${OAUTH_PRESETS.map((p) => p.label).join(', ')}`),
    );
  }
  return Effect.succeed(preset);
};

const addOAuthPresetToken = Effect.fn(function* (preset: OAuthPreset, json: boolean) {
  const accessToken = Obj.make(AccessToken.AccessToken, {
    source: preset.source,
    note: preset.note,
    token: '', // Will be populated by OAuth flow
  });

  yield* performOAuthFlow(preset, accessToken);
  yield* Database.Service.add(accessToken);
  yield* printTokenResult(accessToken, json);
});

const addCustomToken = Effect.fn(function* (data: { source: string; token: string; note?: string }, json: boolean) {
  if (!data.source || !data.token) {
    return yield* Effect.fail(new Error('Source and token are required for custom tokens'));
  }

  const accessToken = Obj.make(AccessToken.AccessToken, {
    source: data.source,
    note: data.note || '',
    token: data.token,
  });

  yield* Database.Service.add(accessToken);
  yield* printTokenResult(accessToken, json);
});

const printTokenResult = Effect.fn(function* (accessToken: AccessToken.AccessToken, json: boolean) {
  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          id: accessToken.id,
          source: accessToken.source,
          note: accessToken.note,
        },
        null,
        2,
      ),
    );
  } else {
    yield* Console.log(print(printTokenAdded(accessToken.source)));
  }
});
