//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { DiscordBlueprint } from '#blueprints';
import { BlueprintDefinition, DiscordSettings, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Discord, DiscordEvents } from '#types';

import { translations } from './translations';

export const DiscordPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Discord.Bot.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Discord.Bot).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Discord.Bot).pipe(Option.getOrThrow).hue ?? 'white',
        blueprints: [DiscordBlueprint.key],
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Discord.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Discord.Bot] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activatesAfter: [DiscordEvents.SettingsReady],
    activate: DiscordSettings,
  }),
  Plugin.make,
);
