//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { useScene } from '../../three/index.ts';
import { defaultChaosOptions } from './chaos-presets.ts';
import { type ChaosOptions, createChaosScene } from './chaos-scene.ts';

export type ChaosProps = Util.ThemedClassName<{
  /** Frames are skipped while false, freezing the cloud. */
  active?: boolean;
  /** Polled every frame for the input level (e.g. audio loudness, 0 to about 1) that pulls the cloud into order. */
  getValue?: () => number;
  options?: ChaosOptions;
  /** Particles per side of the simulation texture; changing it rebuilds the scene. */
  size?: number;
}>;

/** A curl-noise particle cloud, simulated on the GPU, that the input level calms and quickens. */
export const Chaos = ({
  classNames,
  active = true,
  getValue,
  options = defaultChaosOptions,
  size = 512,
}: ChaosProps) => {
  const props = useRef({ getValue, options });
  props.current = { getValue, options };
  const { ref, ready } = useScene<HTMLDivElement>(
    (context) => {
      const chaos = createChaosScene(context, size);
      return {
        update: (delta) => chaos.update(delta, props.current.getValue?.() ?? 0, props.current.options),
        dispose: chaos.dispose,
      };
    },
    [size],
    { alpha: true, active },
  );

  return (
    <div
      ref={ref}
      className={mx('relative transition-opacity duration-1000 opacity-0', ready && 'opacity-100', classNames)}
    />
  );
};
