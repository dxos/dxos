//
// Copyright 2026 DXOS.org
//

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Color3, Color4, Vector3 } from '@babylonjs/core/Maths/math';
import { Scene } from '@babylonjs/core/scene';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { TerraObject } from '#types';

import { EXPLOSION_SECONDS, type ObjectState, type SimObject } from '../sim/index.ts';
import { ExplosionLayer } from './explosion-layer.ts';
import { createObjectForm } from './object-forms.ts';
import { SCALE_FACTOR } from './orientation.ts';

/** Neutral space backdrop, matching the planet scene's clear color. */
const BACKGROUND_COLOR = new Color4(0.043, 0.051, 0.071, 1);

/** Stands in for the sea radius: the blast and the rocket are both sized relative to it, exactly as they are over a real planet. */
const IMPACT_RADIUS = 2;

/** Pause between runs, so the rocket is visible again before the next one goes off. */
const INTERVAL_SECONDS = 1.5;

const rocket = TerraObject.make({ kind: 'rocket', name: 'rocket', speed: 0.05, spawnedAt: 0 });

/** The impact point, straight up the +Y axis — the layer draws at `unit * radius`, as it does in the live scene. */
const IMPACT_UNIT: [number, number, number] = [0, 1, 0];

/** A landed rocket `explosion` through its blast. Written out in full so the story shows exactly which parts of a state the layer reads. */
const impactState = (explosion: number): ObjectState => ({
  unit: IMPACT_UNIT,
  radius: IMPACT_RADIUS,
  bearing: 0,
  route: [],
  legStart: 0,
  leg: 0,
  arrived: true,
  pitch: 0,
  phase: 'descent',
  flightFraction: 1,
  explosion,
});

const ExplosionScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
    const scene = new Scene(engine);
    scene.clearColor = BACKGROUND_COLOR;

    const target = new Vector3(0, IMPACT_RADIUS, 0);
    // Framed on the blast at its widest (the outer shell reaches `IMPACT_RADIUS * 0.05`).
    const camera = new ArcRotateCamera('camera', Math.PI * 0.5, Math.PI * 0.45, 0.34, target, scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 200;
    camera.lowerRadiusLimit = 0.15;
    camera.upperRadiusLimit = 4;
    camera.minZ = 0.01;

    // Same two-light matte NPR setup as the planet scene (`engine/scene-manager.ts`).
    const key = new HemisphericLight('key', new Vector3(0.5, 1, 0.4), scene);
    key.intensity = 0.95;
    key.groundColor = new Color3(0.35, 0.37, 0.42);
    const fill = new HemisphericLight('fill', new Vector3(-0.6, -0.3, -0.7), scene);
    fill.intensity = 0.25;

    // The rocket that is about to be destroyed, drawn at the scale `ObjectLayer` gives it.
    const form = createObjectForm('rocket', scene);
    form.isVisible = true;
    form.position = target;
    const scaling = IMPACT_RADIUS * SCALE_FACTOR;
    form.scaling = new Vector3(scaling, scaling, scaling);

    const layer = new ExplosionLayer({ scene });

    const cycleMs = (EXPLOSION_SECONDS + INTERVAL_SECONDS) * 1000;
    const start = performance.now();
    engine.runRenderLoop(() => {
      // Loops the blast the live scene plays once: burn through it, then wait with the rocket back
      // on the ground, so a viewer sees the transition rather than a single frame of it.
      const cycle = (performance.now() - start) % cycleMs;
      const exploding = cycle < EXPLOSION_SECONDS * 1000;
      const explosion = exploding ? cycle / (EXPLOSION_SECONDS * 1000) : 1;
      const object: SimObject = { definition: rocket, state: impactState(explosion) };
      layer.update([object]);
      // A rocket is destroyed by its own impact — the same rule `ObjectLayer` applies.
      form.isVisible = !exploding;
      scene.render();
    });

    const handleResize = (): void => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stopRenderLoop();
      layer.dispose();
      form.dispose(false, true);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return (
    <div className='relative dx-fill'>
      {/* `dx-fill` is load-bearing — see `ObjectGallery.stories.tsx`. */}
      <canvas ref={canvasRef} className='dx-fill dx-fullscreen outline-none' style={{ touchAction: 'none' }} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-terra/scene/ExplosionGallery',
  component: ExplosionScene,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ExplosionScene>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The blast a rocket leaves where it lands, on a loop at a fixed camera — in the live scene it
 * happens once, roughly a minute into a flight, wherever that flight ended.
 *
 * Test:
 * 1. The rocket stands on the impact point; every 4 seconds it is replaced by an explosion.
 * 2. The blast is three concentric shells — pale core, orange, dark red — that expand together,
 *    fast at first, and fade out as they grow.
 * 3. The rocket is gone for as long as the blast burns, and back once it has faded.
 * 4. Drag to orbit and scroll to zoom: the shells are spheres from every angle.
 */
export const Default: Story = {};
