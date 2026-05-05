//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Granola } from '#types';

import { translations } from './translations';

export const GranolaPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Granola.GranolaAccount.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Granola.GranolaAccount).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Granola.GranolaAccount).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: Granola.CreateGranolaAccountSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Granola.makeAccount(props);
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
  AppPlugin.addSchemaModule({
    schema: [Granola.GranolaAccount, Granola.GranolaSyncRecord],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
