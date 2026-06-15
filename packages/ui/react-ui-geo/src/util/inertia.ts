//
// Copyright 2017 Philippe Rivière
// Copyright 2024 DXOS.org
// https://github.com/Fil/d3-inertia
//

import { drag, select, timer } from 'd3';
import versor from 'versor';

export const restrictAxis =
  (axis: boolean[]) =>
  (original: number[], current: number[]): number[] =>
    current.map((d, i) => (axis[i] ? d : original[i]));

/**
 * Applies a drag handler to the specified target element.
 */
// TODO(burdon): Define type.
export const geoInertiaDrag = (target, render, projection, options) => {
  if (!options) {
    options = {};
  }

  // Target can be an element, a selector, a function, or a selection
  // but in case of a selection we make sure to reselect it with d3-selection.
  if (target.node) {
    target = target.node();
  }
  target = select(target);

  // `linear` (default) constrains rotation so that mouse Δx maps to lambda
  // (polar spin) and Δy maps to phi (tilt); gamma is held at 0.
  // `versor` lets the dragged point follow the cursor exactly, at the cost of
  // inducing some roll. In linear mode `lockTilt` keeps phi pinned but still
  // allows lambda from Δx.
  const linear = (options.mode ?? 'linear') === 'linear';
  const axis = restrictAxis(options.lockTilt ? [true, false, false] : [true, true, true]);
  const sharedHandlers = {
    projection,
    render: (rotation) => {
      projection.rotate(rotation);
      render && render();
    },
    axis,
    start: options.start,
    move: options.move,
    end: options.end,
    stop: options.stop,
    finish: options.finish,
    time: options.time,
    hold: options.hold,
  };

  // Complete params: (projection, render, startDrag, dragging, endDrag).
  const inertia = linear
    ? geoInertiaDragLinearHelper({
        ...sharedHandlers,
        sensitivity: options.sensitivity,
        getZoom: options.getZoom,
      })
    : geoInertiaDragHelper(sharedHandlers);

  target.call(drag().on('start', inertia.start).on('drag', inertia.move).on('end', inertia.end));
  return inertia;
};

/**
 * A versor is a compact way to describe a rotation in 3D space.
 * It consists of four components [𝑤,x,y,z], where:
 * 𝑤 is a scalar representing the angle of rotation.
 * x, y, z are the vector components, representing the axis of rotation.
 */
const geoInertiaDragHelper = (opt) => {
  const projection = opt.projection;

  let v0; // Mouse position in Cartesian coordinates at start of drag gesture.
  let r0; // Projection rotation as Euler angles at start.
  let q0; // Projection rotation as versor at start.
  let v10; // Mouse position in Cartesian coordinates just before end of drag gesture.
  let v11; // Mouse position in Cartesian coordinates at end.
  let q10; // Projection rotation as versor at end.

  const inertia = inertiaHelper({
    axis: opt.axis,

    start: () => {
      v0 = versor.cartesian(projection.invert(inertia.position));
      r0 = projection.rotate();
      q0 = versor(r0);
      opt.start && opt.start();
    },

    move: () => {
      const inv = projection.rotate(r0).invert(inertia.position);
      if (isNaN(inv[0])) {
        return;
      }
      const v1 = versor.cartesian(inv);
      const q1 = versor.multiply(q0, versor.delta(v0, v1));
      const r1 = versor.rotation(q1);
      const r2 = opt.axis(r0, r1);
      opt.render(r2);
      opt.move && opt.move();
    },

    end: () => {
      // Velocity.
      v10 = versor.cartesian(projection.invert(inertia.position.map((d, i) => d - inertia.velocity[i] / 1_000)));
      q10 = versor(projection.rotate());
      v11 = versor.cartesian(projection.invert(inertia.position));
      opt.end && opt.end();
    },

    stop: opt.stop,

    finish: opt.finish,

    render: (t) => {
      const r1 = versor.rotation(versor.multiply(q10, versor.delta(v10, v11, t * 1_000)));
      const r2 = opt.axis(r0, r1);
      opt.render && opt.render(r2);
    },

    time: opt.time,
  });

  return inertia;
};

/**
 * Linear pixel-to-Euler drag: Δx → lambda, Δy → phi, gamma fixed at 0.
 * Inertia spin-down reuses the same shared decay curve as the versor path.
 */
const DEFAULT_LINEAR_SENSITIVITY = 0.25;

const geoInertiaDragLinearHelper = (opt) => {
  const projection = opt.projection;
  const sensitivity = opt.sensitivity ?? DEFAULT_LINEAR_SENSITIVITY;
  // Scale degrees-per-pixel by 1/zoom so the drag feels consistent at any zoom
  // level (mirrors useWheel — a more zoomed-in globe needs smaller angular
  // rotation per pixel of cursor travel). Clamped to a floor so very small
  // zoom values don't blow up the gain.
  const gain = () => sensitivity / Math.max(opt.getZoom?.() ?? 1, 0.1);

  let r0; // Projection rotation as Euler angles at start of drag.
  let p0; // Pointer pixel position at start of drag.
  let kStart; // Gain captured at start of drag (held for the gesture + inertia).
  let rEnd; // Projection rotation at end of drag.
  let vEnd; // Pointer velocity (px/s) at end of drag.

  const inertia = inertiaHelper({
    axis: opt.axis,

    start: () => {
      r0 = projection.rotate();
      p0 = [inertia.position[0], inertia.position[1]];
      // Lock the gain at gesture start so a zoom change mid-gesture doesn't
      // teleport the globe; inertia continues at the same gain.
      kStart = gain();
      opt.start && opt.start();
    },

    move: () => {
      const dx = inertia.position[0] - p0[0];
      const dy = inertia.position[1] - p0[1];
      // Screen y grows downward; negate so dragging down rotates the globe to
      // match the cursor (matches the feel of the versor-based path).
      const r1 = [r0[0] + dx * kStart, r0[1] - dy * kStart, 0];
      const r2 = opt.axis(r0, r1);
      opt.render(r2);
      opt.move && opt.move();
    },

    end: () => {
      rEnd = projection.rotate();
      vEnd = [inertia.velocity[0], inertia.velocity[1]];
      opt.end && opt.end();
    },

    stop: opt.stop,

    finish: opt.finish,

    render: (t) => {
      // t goes 0→1 along the decay curve; at t=1 we've added ~1s of velocity.
      // dy sign flipped to match the move handler.
      const r1 = [rEnd[0] + vEnd[0] * kStart * t, rEnd[1] - vEnd[1] * kStart * t, 0];
      const r2 = opt.axis(rEnd, r1);
      opt.render && opt.render(r2);
    },

    time: opt.time,
  });

  return inertia;
};

function inertiaHelper(opt) {
  const A = opt.time || 5_000; // Reference time in ms.
  const limit = 1.0001;
  const B = -Math.log(1 - 1 / limit);
  const inertia = {
    position: [0, 0],
    velocity: [0, 0], // Velocity in pixels/s.
    timer: timer(() => {}),
    time: 0,
    t: 0,

    start: function (ev) {
      const position = [ev.x, ev.y];
      inertia.position = position;
      inertia.velocity = [0, 0];
      inertia.timer.stop();
      this.classList.remove('inertia');
      this.classList.add('dragging');
      opt.start && opt.start.call(this, position);
    },

    move: function (ev) {
      const position = [ev.x, ev.y];
      const time = performance.now();
      const deltaTime = time - inertia.time;
      const decay = 1 - Math.exp(-deltaTime / 1_000);
      inertia.velocity = inertia.velocity.map((d, i) => {
        const deltaPos = position[i] - inertia.position[i];
        const deltaTime = time - inertia.time;
        return (1_000 * (1 - decay) * deltaPos) / deltaTime + d * decay;
      });

      // Clamp velocity axis.
      inertia.velocity = opt.axis([0, 0], inertia.velocity);

      inertia.time = time;
      inertia.position = position;
      opt.move && opt.move.call(this, position);
    },

    end: function (ev) {
      this.classList.remove('dragging', 'inertia');

      const v = inertia.velocity;
      if (v[0] * v[0] + v[1] * v[1] < 100) {
        inertia.timer.stop();
        return opt.stop && opt.stop();
      }

      const time = performance.now();
      const deltaTime = time - inertia.time;

      if (opt.hold === undefined) {
        opt.hold = 100;
      } // Default flick->drag threshold time (0 disables inertia).

      if (deltaTime >= opt.hold) {
        inertia.timer.stop();
        return opt.stop && opt.stop();
      }

      this.classList.add('inertia');
      opt.end && opt.end();

      const self = this;
      inertia.timer.restart((e) => {
        inertia.t = limit * (1 - Math.exp((-B * e) / A));
        opt.render && opt.render(inertia.t);
        if (inertia.t > 1) {
          inertia.timer.stop();
          self.classList.remove('inertia');
          inertia.velocity = [0, 0];
          inertia.t = 1;
          opt.finish && opt.finish();
        }
      });
    },
  };

  inertia.timer.stop();
  return inertia;
}
