//
// Copyright 2026 DXOS.org
//

import {
  type KubeOptions,
  MAX_KUBE_PARTICLES,
  createKubeScene,
  defaultKubeOptions,
  kubePresets,
} from '../../Kube/index.ts';
import { number } from '../params.ts';
import { type Visualization } from '../visualization.ts';
import { glowParams } from './common.ts';

/** The Kube particle web as an avatar: the voice's loudness quickens the particles and lengthens their links. */
export const kube: Visualization<KubeOptions> = {
  id: 'kube',
  title: 'Kube',
  params: {
    particles: number(20, MAX_KUBE_PARTICLES, 10, 'Particles'),
    distance: number(0.1, 1, 0.01, 'Link distance'),
    speed: number(0, 3, 0.05, 'Speed'),
    reaction: number(0, 3, 0.1, 'Reaction'),
    rotation: number(0, 1, 0.01, 'Rotation'),
    ...glowParams,
  },
  defaults: defaultKubeOptions,
  presets: kubePresets,
  create: (context) => {
    const scene = createKubeScene(context);
    return {
      update: ({ delta, signals }, config) => scene.update(delta, signals.voice.level, config),
      dispose: scene.dispose,
    };
  },
};
