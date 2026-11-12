//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { isScene } from '../runtime.ts';
import { isStage } from '../stage.ts';
import { Embed } from './Embed.tsx';

/** {@link Embed} for the `stage` and `scene` in the page's query, as `/embed/halo/` renders it. */
export const EmbedPage = () => {
  const params = new URLSearchParams(window.location.search);
  const stage = params.get('stage');
  const scene = params.get('scene');
  if (!isStage(stage) || !isScene(scene)) {
    throw new Error(`Unknown stage or scene: ${stage}, ${scene}`);
  }
  return <Embed stage={stage} scene={scene} />;
};
