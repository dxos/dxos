//
// Copyright 2026 DXOS.org
//

import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { type Observer } from '@babylonjs/core/Misc/observable';
import { type Scene } from '@babylonjs/core/scene';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Terra, TerraObject } from '#types';

import { PlanetCache, SceneManager, cross, normalize, seaRadius } from '../engine';
import { BALLISTIC_APEX, EXPLOSION_SECONDS, SimEngine, angleBetween, slerp, toUnit } from '../sim';
import { ExplosionLayer } from './explosion-layer';
import { ObjectLayer } from './object-layer';
import { TrailLayer } from './trail-layer';

/** Both ends of the flight, close enough together that the whole arc fits in one view. */
const SOURCE = { lat: 0, lng: -18, height: 0 };
const TARGET = { lat: 0, lng: 18, height: 0 };

/** Fast enough that a viewer sees a whole launch-to-impact cycle without waiting on it. */
const ROCKET_SPEED = 0.15;

/** Pause after the blast before the next launch. */
const INTERVAL_SECONDS = 1;

/** How far off the arc's plane the camera stands. Larger frames more of the globe; smaller crops to the trajectory. */
const STANDOFF = 2.6;

type StoryArgs = {
  /** Freezes the flight at this fraction of a launch-to-impact-to-blast cycle; unset plays it on a loop. */
  progress?: number;
};

const RocketArcScene = ({ progress }: StoryArgs) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });
    const config = Terra.toConfigValues(terra);
    const rocket = TerraObject.make({
      kind: 'rocket',
      name: 'rocket',
      speed: ROCKET_SPEED,
      source: SOURCE,
      target: TARGET,
      spawnedAt: 0,
    });

    const manager = new SceneManager(canvas);
    manager.render(new PlanetCache().resolve(config));

    const objects = new ObjectLayer({ scene: manager.scene });
    const trails = new TrailLayer({ scene: manager.scene });
    const explosions = new ExplosionLayer({ scene: manager.scene });
    // No nav grid: a ballistic arc is closed-form between its endpoints and never routes.
    const engine = new SimEngine({ config, definitions: [rocket] });

    const source = toUnit(SOURCE);
    const target = toUnit(TARGET);
    const sea = seaRadius(config);
    const middle = slerp(source, target, 0.5);
    // The camera stands off the plane the arc lies in, so the flight is seen edge-on — the view that
    // shows its altitude at all. Local up at the arc's midpoint is the screen's up, which is what
    // puts the planet along the bottom of the frame rather than in the middle of it.
    const normal = normalize(cross(source, target));
    const up = new Vector3(middle[0], middle[1], middle[2]);
    const centre = up.scale(sea * (1 + BALLISTIC_APEX * 0.45));
    const camera = new FreeCamera('arc', centre.add(new Vector3(...normal).scale(STANDOFF)), manager.scene);
    camera.upVector = up;
    camera.setTarget(centre);
    camera.minZ = 0.01;
    manager.setActiveCamera(camera);

    const flightSeconds = angleBetween(source, target) / ROCKET_SPEED;
    const cycleMs = (flightSeconds + EXPLOSION_SECONDS + INTERVAL_SECONDS) * 1000;
    const start = performance.now();
    const observer: Observer<Scene> = manager.scene.onBeforeRenderObservable.add(() => {
      // Loops one launch: the rocket flies its arc, lands, explodes, and goes again — or holds at a
      // single instant of it, which is what makes a given moment of the flight reviewable at all.
      const nowMs = progress === undefined ? (performance.now() - start) % cycleMs : progress * cycleMs;
      engine.evaluateAt(nowMs);
      objects.update(engine.objects, manager.engine.getDeltaTime());
      trails.update(engine.objects, config, nowMs);
      explosions.update(engine.objects);
    });

    return () => {
      manager.scene.onBeforeRenderObservable.remove(observer);
      explosions.dispose();
      trails.dispose();
      objects.dispose();
      manager.dispose();
    };
  }, [progress]);

  return (
    <div className='relative w-full h-full'>
      {/* `dx-container` (w-full h-full) is load-bearing — see `ObjectGallery.stories.tsx`. */}
      <canvas ref={canvasRef} className='dx-container absolute inset-0 outline-none' style={{ touchAction: 'none' }} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-terra/scene/RocketArc',
  component: RocketArcScene,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
  argTypes: { progress: { control: { type: 'range', min: 0, max: 1, step: 0.01 } } },
} satisfies Meta<typeof RocketArcScene>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * One rocket's ballistic arc seen edge-on, with the planet dropped to the bottom of the frame — the
 * view that shows what a flight actually does with its altitude, which the orbit camera never
 * really does.
 *
 * Test:
 * 1. The rocket lifts off, arcs over, and comes down, on a loop.
 * 2. Its nose stays along the flight path the whole way: up through the climb, level at apex, down
 *    into the descent. It never points somewhere it is not going.
 * 3. The orange exhaust trails from the tail, below and behind it, and stops at apex.
 * 4. It is destroyed on impact, leaving an explosion where it came down.
 * 5. Drag the `progress` control to hold the flight at any instant of it.
 */
export const Default: Story = {};
