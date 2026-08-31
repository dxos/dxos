//
// Copyright 2026 DXOS.org
//

import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { type Observer } from '@babylonjs/core/Misc/observable';
import { type Scene } from '@babylonjs/core/scene';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef } from 'react';

import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Terra, TerraObject } from '#types';

import { PlanetCache, SceneManager, cross, normalize, seaRadius } from '../engine';
import { BALLISTIC_APEX, EXPLOSION_SECONDS, SimEngine, angleBetween, slerp, toUnit } from '../sim';
import { STORY_ATTENDABLE_ID, withAttention } from '../testing';
import { ExplosionLayer } from './explosion-layer';
import { ObjectLayer } from './object-layer';
import { TrailLayer } from './trail-layer';

/** Both ends of the flight, close enough together that the whole arc fits in one view. */
const SOURCE = { lat: 0, lng: -18, height: 0 };
const TARGET = { lat: 0, lng: 18, height: 0 };

/** Fast enough that a viewer sees a whole launch-to-impact cycle without waiting on it. */
const ROCKET_SPEED = 0.15;

/** How far off the arc's plane the camera stands. Larger frames more of the globe; smaller crops to the trajectory. */
const STANDOFF = 2.6;

/** How far the camera is lifted toward the zenith above the arc, rolling the globe toward the viewer so the ground under the flight is visible rather than edge-on. */
const TILT = (28 * Math.PI) / 180;

const RocketArcScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The instant the current flight began. Set by the toolbar, read by the render loop, so a launch
  // never has to tear the scene down and build it again.
  const launchedAt = useRef(performance.now());

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
    // shows its altitude at all — and is then lifted `TILT` toward the zenith, which rolls the globe
    // toward the viewer so the ground under the flight reads as ground rather than a horizon line.
    // Local up at the arc's midpoint is the screen's up, which keeps the planet along the bottom.
    const normal = normalize(cross(source, target));
    const up = new Vector3(middle[0], middle[1], middle[2]);
    const centre = up.scale(sea * (1 + BALLISTIC_APEX * 0.45));
    const offset = new Vector3(...normal).scale(Math.cos(TILT)).add(up.scale(Math.sin(TILT)));
    const camera = new FreeCamera('arc', centre.add(offset.scale(STANDOFF)), manager.scene);
    camera.upVector = up;
    camera.setTarget(centre);
    camera.minZ = 0.01;
    manager.setActiveCamera(camera);

    const flightSeconds = angleBetween(source, target) / ROCKET_SPEED;
    const cycleMs = (flightSeconds + EXPLOSION_SECONDS) * 1000;
    const observer: Observer<Scene> = manager.scene.onBeforeRenderObservable.add(() => {
      // One flight per launch: the rocket climbs, comes down, and explodes, then waits back on the
      // pad — the sim clock rewinds to zero, which is where its own departure point is.
      const elapsedMs = performance.now() - launchedAt.current;
      const nowMs = elapsedMs > cycleMs ? 0 : elapsedMs;
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
  }, []);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'launch',
          {
            label: 'Launch',
            icon: 'ph--rocket-launch--regular',
            disposition: 'toolbar',
            testId: 'terra.arc.launch',
          },
          () => {
            launchedAt.current = performance.now();
          },
        )
        .build(),
    [],
  );

  return (
    <Menu.Root {...menuActions} attendableId={STORY_ATTENDABLE_ID}>
      <Panel.Root role='article'>
        <Panel.Toolbar asChild classNames='dx-expand'>
          <Menu.Toolbar>
            <Menu.Items />
          </Menu.Toolbar>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <div className='relative grow'>
            {/* `dx-fill` is load-bearing — see `ObjectGallery.stories.tsx`. */}
            <canvas ref={canvasRef} className='dx-fill dx-fullscreen outline-none' style={{ touchAction: 'none' }} />
          </div>
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

const meta = {
  title: 'plugins/plugin-terra/scene/RocketArc',
  component: RocketArcScene,
  decorators: [withTheme(), withAttention(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof RocketArcScene>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * One rocket's ballistic arc seen edge-on, with the planet dropped to the bottom of the frame — the
 * view that shows what a flight actually does with its altitude, which the orbit camera never
 * really does.
 *
 * Test:
 * 1. The rocket lifts off, arcs over, and comes down — once per launch.
 * 2. Its nose stays along the flight path the whole way: up through the climb, level at apex, down
 *    into the descent. It never points somewhere it is not going.
 * 3. The orange exhaust trails from the tail, below and behind it, and stops at apex.
 * 4. It is destroyed on impact, leaving an explosion where it came down; after the blast it is back
 *    on the pad at its departure point.
 * 5. `Launch` sends it again from there, at any point in the flight.
 */
export const Default: Story = {};
