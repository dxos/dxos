//
// Copyright 2020 DXOS.org
//

import React, { useRef } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { useScene } from '../../three/index.ts';
import { defaultKubeOptions } from './kube-presets.ts';
import { type KubeOptions, createKubeScene } from './kube-scene.ts';

export type KubeProps = Util.ThemedClassName<{
  /** Frames are skipped while false, freezing the particles. */
  active?: boolean;
  /** Polled every frame for the input level (e.g. audio loudness, 0 to about 1) that quickens the particles. */
  getValue?: () => number;
  options?: KubeOptions;
}>;

/** Particles drifting in a turning cube, linked where they pass close; the input level quickens and brightens them. */
export const Kube = ({ classNames, active = true, getValue, options = defaultKubeOptions }: KubeProps) => {
  const props = useRef({ getValue, options });
  props.current = { getValue, options };
  const { ref } = useScene<HTMLDivElement>(
    (context) => {
      const kube = createKubeScene(context);
      return {
        update: (delta) => kube.update(delta, props.current.getValue?.() ?? 0, props.current.options),
        dispose: kube.dispose,
      };
    },
    [],
    { active },
  );

  return <div ref={ref} className={mx('relative grow', classNames)} />;
};
