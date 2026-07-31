//
// Copyright 2026 DXOS.org
//

import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { type Scene } from '@babylonjs/core/scene';

import { scale } from '../engine';
import { type SimObject } from '../sim';
import { SCALE_FACTOR, objectFrame } from './orientation';

/** How far behind the object the camera sits, as a multiple of the object's own rendered scale. */
const STANDOFF = 5;

/** How far above the object's own up axis the camera sits, as a multiple of its rendered scale. */
const ELEVATION = 1.6;

/** How far ahead of the object the camera looks, so the horizon leads rather than the hull filling the frame. */
const LOOK_AHEAD = 12;

/** A satellite's camera sits this far along its up axis, clear of its own solar panels. */
const NADIR_STANDOFF = 2;

/**
 * A camera locked to one simulated object. For every kind but a satellite it trails the object
 * along its long axis, looking the way the object is pointing; a satellite instead looks straight
 * down its nadir, since a nose-forward view from orbit is just empty space.
 *
 * Not a Babylon parented/`lockedTarget` camera: the object is a thin instance, so it has no node to
 * parent to — the pose is recomputed each frame from the same `objectFrame` the mesh is drawn with,
 * which also keeps the view exactly aligned with the rendered form (a rocket's pitch included).
 */
export class ChaseCamera {
  readonly #camera: TargetCamera;

  constructor(options: { scene: Scene }) {
    this.#camera = new TargetCamera('chase', Vector3.Zero(), options.scene);
    // Objects sit within a few hundredths of a unit of the terrain; the default 1.0 near plane
    // would clip the whole scene away.
    this.#camera.minZ = 0.001;
  }

  get camera(): TargetCamera {
    return this.#camera;
  }

  /** Repositions the camera onto `object`'s current pose; call once per frame while the camera is active. */
  update(object: SimObject, heading: number): void {
    const { state, definition } = object;
    const { up, forward } = objectFrame(state, definition.kind, heading);
    const center = scale(state.unit, state.radius);
    const position = new Vector3(center[0], center[1], center[2]);
    const objectScale = state.radius * SCALE_FACTOR;

    if (definition.kind === 'satellite') {
      // Straight down. `upVector` must not be parallel to the view direction or the view matrix is
      // degenerate, so the orbital forward serves as the camera's up — which also keeps the ground
      // track running consistently up the frame rather than spinning.
      this.#camera.position = position.add(up.scale(objectScale * NADIR_STANDOFF));
      this.#camera.upVector = forward;
      this.#camera.setTarget(position.subtract(up));
      return;
    }

    this.#camera.position = position
      .subtract(forward.scale(objectScale * STANDOFF))
      .add(up.scale(objectScale * ELEVATION));
    this.#camera.upVector = up;
    this.#camera.setTarget(position.add(forward.scale(objectScale * LOOK_AHEAD)));
  }

  dispose(): void {
    this.#camera.dispose();
  }
}
