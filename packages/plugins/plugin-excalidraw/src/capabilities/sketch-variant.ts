//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { IllustratorCapabilities, type SketchVariant } from '@dxos/plugin-illustrator/types';

import { ExcalidrawArticle } from '#containers';
import { excalidrawBuilder } from '#model';

import { Excalidraw } from '../types';

const variant: SketchVariant = {
  id: Type.getTypename(Excalidraw.Canvas),
  label: 'Excalidraw',
  icon: 'ph--compass-tool--regular',
  canvasType: Excalidraw.Canvas,
  createCanvas: () => Effect.sync(() => Excalidraw.makeCanvas()),
  builder: excalidrawBuilder,
  article: ExcalidrawArticle,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(IllustratorCapabilities.VariantProvider, variant)),
);
