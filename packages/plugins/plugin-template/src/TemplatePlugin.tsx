//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { meta } from '#meta';
import { translations } from './translations';
import { Template } from '#types';

import { ReactSurface } from '#capabilities';

export const TemplatePlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Template.Data.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Template.Data).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Template.Data).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Template.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Template.Data] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
