//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compileScript, trackValue } from '@dxos/animation';
import { Obj } from '@dxos/echo';

import { Scene } from '#types';

import {
  SPACETIME_LAYOUTS,
  cameraOf,
  defaultCamera,
  spacetimeStageBinding,
  spacetimeStageTargets,
} from '../animator/index.ts';
import { makeEcho3dAnimation } from './echo3d.ts';

describe('echo3d fixture', () => {
  test('every shot compiles against its scene and samples to finite positions and a camera', ({ expect }) => {
    const { animation, scenes } = makeEcho3dAnimation();
    expect(scenes).toHaveLength(4);
    expect(animation.shots.length).toBeGreaterThanOrEqual(12);
    for (const shot of animation.shots) {
      const stage = shot.stage.target;
      expect(Obj.instanceOf(Scene.Scene, stage)).toBe(true);
      if (!Obj.instanceOf(Scene.Scene, stage)) {
        continue;
      }
      const targets = spacetimeStageTargets(stage);
      const compiled = compileScript(shot.script ?? [], {
        targets: Object.fromEntries(targets.map((target) => [target.id, target.values])),
        layouts: SPACETIME_LAYOUTS,
        duration: shot.duration,
        kinds: Object.fromEntries(targets[0].properties.map(({ path, kind }) => [path, kind])),
        camera: { ...defaultCamera(stage) },
      });
      for (const t of [0, shot.duration / 2, shot.duration]) {
        const values: Record<string, Record<string, unknown>> = {};
        const camera: Record<string, unknown> = {};
        for (const track of Object.values(compiled.timeline.tracks)) {
          const value = trackValue(track, t);
          if (track.target === 'camera') {
            camera[track.property] = value;
          } else {
            values[track.target] = { ...values[track.target], [track.property]: value };
          }
        }
        const binding = spacetimeStageBinding(stage, { t, values });
        for (const object of Object.values(binding.objects)) {
          expect(Number.isFinite(object.position.x + object.position.y + object.position.z + object.radius)).toBe(true);
        }
        const pose = cameraOf(camera);
        expect(Number.isFinite(pose.alpha + pose.beta + pose.radius)).toBe(true);
      }
    }
  });

  test('the merge shot leaves one lab, renamed, with the others merged into it', ({ expect }) => {
    const { animation, scenes } = makeEcho3dAnimation();
    const labs = scenes.find((scene) => scene.name === 'Frontier labs');
    const merge = animation.shots[7];
    expect(merge.stage.target?.id).toBe(labs?.id);
    if (!labs) {
      return;
    }
    const targets = spacetimeStageTargets(labs);
    const { timeline } = compileScript(merge.script ?? [], {
      targets: Object.fromEntries(targets.map((target) => [target.id, target.values])),
      layouts: SPACETIME_LAYOUTS,
      duration: merge.duration,
      kinds: Object.fromEntries(targets[0].properties.map(({ path, kind }) => [path, kind])),
    });
    const [lab, rival1, rival2] = targets;
    const end = merge.duration;
    expect(trackValue(timeline.tracks[`${rival1.id}:opacity`], end)).toBe(0);
    expect(trackValue(timeline.tracks[`${rival2.id}:opacity`], end)).toBe(0);
    expect(trackValue(timeline.tracks[`${lab.id}:position`], end)).toEqual({ x: 0, y: 0, z: 0 });
    expect(trackValue(timeline.tracks[`${lab.id}:label`], end)).toBe('The Final Frontier');
    expect(trackValue(timeline.tracks[`${lab.id}:labelStyle`], end)).toBe('title');
  });
});
