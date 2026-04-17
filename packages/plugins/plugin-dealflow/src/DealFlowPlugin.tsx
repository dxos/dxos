//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { BlueprintDefinition, DealSync, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Dashboard, Deal, Signal } from '#types';

import { translations } from './translations';

/** Input schema for creating a Deal via the create dialog. */
const CreateDealSchema = Schema.Struct({
  name: Schema.String.annotations({
    title: 'Deal Name',
    description: 'Name of the deal (typically the company name).',
  }),
  stage: Schema.optional(Schema.String.annotations({
    title: 'Stage',
    description: 'Pipeline stage (sourcing, screening, diligence, termsheet, closed, passed).',
  })),
  round: Schema.optional(Schema.String.annotations({
    title: 'Round',
    description: 'Investment round (pre-seed, seed, series-a, etc.).',
  })),
});

export const DealFlowPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Deal.Deal.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Deal.Deal).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Deal.Deal).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: CreateDealSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Deal.make({
                name: props.name,
                stage: props.stage ?? 'sourcing',
                round: props.round,
              });
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: false,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Signal.Signal.typename,
        metadata: {
          label: (object: Signal.Signal) => object.title,
          icon: Annotation.IconAnnotation.get(Signal.Signal).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Signal.Signal).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
      {
        id: Dashboard.Dashboard.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Dashboard.Dashboard).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Dashboard.Dashboard).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Dashboard.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: false,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
    ],
  }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Dashboard.Dashboard, Deal.Deal, Signal.Signal],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'deal-sync',
    activatesOn: ActivationEvents.Startup,
    activate: DealSync,
  }),
  Plugin.make,
);
