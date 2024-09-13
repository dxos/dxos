//
// Copyright 2017 Philippe Rivière
// Copyright 2024 DXOS.org
// https://github.com/Fil/d3-inertia
//

import * as d3 from 'd3';
import versor from 'versor';

/**
 * In simpler terms, a versor is a compact way to describe a rotation in 3D space.
 * It consists of four components [𝑤,x,y,z], where:
 * 𝑤 is the scalar part, representing the angle of rotation.
 * x, y, z are the vector components, representing the axis of rotation.
 */
// TODO(burdon): Constrain axis.
// const restrictAxis = (q: [number, number, number, number]) => {
//   const [w, x, _y, _z] = q;
//   return [w, x, 0, 0];
// };

export const geoInertiaDragHelper = (opt) => {
  const projection = opt.projection;
  let v0; // Mouse position in Cartesian coordinates at start of drag gesture.
  let r0; // Projection rotation as Euler angles at start.
  let q0; // Projection rotation as versor at start.
  let v10; // Mouse position in Cartesian coordinates just before end of drag gesture.
  let v11; // Mouse position in Cartesian coordinates at end.
  let q10; // Projection rotation as versor at end.
  const inertia = inertiaHelper({
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
      opt.render(r1);
      opt.move && opt.move();
    },
    end: () => {
      // velocity
      v10 = versor.cartesian(projection.invert(inertia.position.map((d, i) => d - inertia.velocity[i] / 1000)));
      q10 = versor(projection.rotate());
      v11 = versor.cartesian(projection.invert(inertia.position));
      opt.end && opt.end();
    },
    stop: opt.stop,
    finish: opt.finish,
    render: (t) => {
      const rotation = versor.rotation(versor.multiply(q10, versor.delta(v10, v11, t * 1000)));
      opt.render && opt.render(rotation);
    },
    time: opt.time,
  });

  return inertia;
};

export const geoInertiaDrag = (target, render, projection, options) => {
  if (!options) {
    options = {};
  }

  // target can be an element, a selector, a function, or a selection
  // but in case of a selection we make sure to reselect it with d3-selection@2
  if (target.node) {
    target = target.node();
  }
  target = d3.select(target);

  // complete params: (projection, render, startDrag, dragging, endDrag)
  const inertia = geoInertiaDragHelper({
    projection,
    render: (rotation) => {
      projection.rotate(rotation);
      render && render();
    },
    start: options.start,
    move: options.move,
    end: options.end,
    stop: options.stop,
    finish: options.finish,
    time: options.time,
    hold: options.hold,
  });

  target.call(d3.drag().on('start', inertia.start).on('drag', inertia.move).on('end', inertia.end));
  return inertia;
};

export function inertiaHelper(opt) {
  const A = opt.time || 5_000; // reference time in ms
  const limit = 1.0001;
  const B = -Math.log(1 - 1 / limit);
  const inertia = {
    position: [0, 0],
    velocity: [0, 0], // in pixels/s
    timer: d3.timer(() => {}),
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
      } // default flick->drag threshold time (0 disables inertia)

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
