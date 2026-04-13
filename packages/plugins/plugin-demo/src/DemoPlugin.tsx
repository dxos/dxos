//
// Copyright 2026 DXOS.org
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
import { Demo } from '#types';

import { translations } from './translations';

export const DemoPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Demo.DemoController.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Demo.DemoController).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Demo.DemoController).pipe(Option.getOrThrow).hue ?? 'cyan',
          inputSchema: Demo.CreateDemoControllerSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Demo.makeController(props);
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
    schema: [Demo.DemoController, Demo.DemoEvent],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
