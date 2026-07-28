//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { IllustratorCapabilities, type SketchVariant } from '@dxos/plugin-illustrator/types';

import { TldrawArticle, TldrawCard } from '#containers';
import { tldrawBuilder } from '#model';

import { Tldraw } from '../types';

const variant: SketchVariant = {
  id: Type.getTypename(Tldraw.Canvas),
  label: 'tldraw',
  icon: 'ph--compass-tool--regular',
  canvasType: Tldraw.Canvas,
  createCanvas: () => Effect.sync(() => Tldraw.makeCanvas()),
  builder: tldrawBuilder,
  card: TldrawCard,
  article: TldrawArticle,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(IllustratorCapabilities.VariantProvider, variant)),
);
