//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';

import { OperationHandler, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { Sheet } from '#types';

import { serializer } from './serializer';

export const SheetPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Sheet.Sheet.typename,
      metadata: {
        label: (object: Sheet.Sheet) => object.name,
        icon: Annotation.IconAnnotation.get(Sheet.Sheet).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Sheet.Sheet).pipe(Option.getOrThrow).hue ?? 'white',
        serializer,
        comments: 'anchored',
      },
    },
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({ schema: [Sheet.Sheet] }),
  Plugin.make,
);

export default SheetPlugin;
