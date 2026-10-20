//
// Copyright 2026 DXOS.org
//

import { type ChaosOptions, chaosPresets, createChaosScene, defaultChaosOptions } from '../../Chaos/index.ts';
import { color, number } from '../params.ts';
import { type Visualization } from '../visualization.ts';

/** The Chaos particle cloud as an avatar: the voice's loudness pulls it toward order and quickens its flow. */
export const chaos: Visualization<ChaosOptions> = {
  id: 'chaos',
  title: 'Chaos',
  params: {
    speed: number(0, 100, 1, 'Speed'),
    curl: number(0.01, 5, 0.01, 'Curl'),
    chaos: number(0, 4, 1, 'Chaos'),
    alpha: number(0, 1, 0.01, 'Alpha'),
    gain: number(0, 2, 0.05, 'Gain'),
    fov: number(30, 150, 1, 'Field of view'),
    zoom: number(0.1, 5, 0.1, 'Zoom'),
    distance: number(0.5, 10, 0.1, 'Distance'),
    focus: number(-1, 1, 0.01, 'Focus'),
    aperture: number(0, 5.6, 0.1, 'Aperture'),
    rotation: number(-20, 20, 0.5, 'Rotation'),
    color: color('Colour'),
  },
  defaults: defaultChaosOptions,
  presets: chaosPresets,
  create: (context) => {
    const scene = createChaosScene(context);
    return {
      update: ({ delta, signals }, config) => scene.update(delta, signals.voice.level, config),
      dispose: scene.dispose,
    };
  },
};
