//
// Copyright 2019 DXOS.org
//

// TODO(burdon): https://www.npmjs.com/package/versor

type VersorType = [number, number, number, number];

/**
 * Code from:
 * https://observablehq.com/@mbostock/top-100-cities
 * https://observablehq.com/@d3/versor-dragging
 */
export class Versor {
  static interpolateScalar = (s1, s2) => t => (s1 + (s2 - s1) * t);

  static interpolatePoint = (v1, v2) => t => ({ x: (v1.x + (v2.x - v1.x) * t), y: (v1.y + (v2.y - v1.y) * t) });

  static coordinatesToAngles = ({ lat = 0, lng = 0 }, tilt = 0) => [-lng, tilt - lat, 0];

  static fromAngles ([l, p, g]): VersorType {
    l *= Math.PI / 360;
    p *= Math.PI / 360;
    g *= Math.PI / 360;

    const sl = Math.sin(l); const cl = Math.cos(l);
    const sp = Math.sin(p); const cp = Math.cos(p);
    const sg = Math.sin(g); const cg = Math.cos(g);

    return [
      cl * cp * cg + sl * sp * sg,
      sl * cp * cg - cl * sp * sg,
      cl * sp * cg + sl * cp * sg,
      cl * cp * sg - sl * sp * cg
    ];
  }

  static toAngles ([a, b, c, d]) {
    return [
      Math.atan2(2 * (a * b + c * d), 1 - 2 * (b * b + c * c)) * 180 / Math.PI,
      Math.asin(Math.max(-1, Math.min(1, 2 * (a * c - d * b)))) * 180 / Math.PI,
      Math.atan2(2 * (a * d + b * c), 1 - 2 * (c * c + d * d)) * 180 / Math.PI
    ];
  }

  static interpolateAngles (a, b) {
    const i = Versor.interpolate(Versor.fromAngles(a), Versor.fromAngles(b));
    return t => Versor.toAngles(i(t));
  }

  static interpolateLinear ([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    a2 -= a1;
    b2 -= b1;
    c2 -= c1;
    d2 -= d1;
    const x = new Array(4);
    return t => {
      const l = Math.hypot(x[0] = a1 + a2 * t, x[1] = b1 + b2 * t, x[2] = c1 + c2 * t, x[3] = d1 + d2 * t);
      x[0] /= l;
      x[1] /= l;
      x[2] /= l;
      x[3] /= l;
      return x;
    };
  }

  static interpolate ([a1, b1, c1, d1], [a2, b2, c2, d2]): Function {
    let dot = a1 * a2 + b1 * b2 + c1 * c2 + d1 * d2;
    if (dot < 0) {
      a2 = -a2;
      b2 = -b2;
      c2 = -c2;
      d2 = -d2;
      dot = -dot;
    }
    if (dot > 0.9995) {
      return Versor.interpolateLinear([a1, b1, c1, d1], [a2, b2, c2, d2]);
    }
    const theta0 = Math.acos(Math.max(-1, Math.min(1, dot)));
    const x = new Array(4);
    const l = Math.hypot(a2 -= a1 * dot, b2 -= b1 * dot, c2 -= c1 * dot, d2 -= d1 * dot);
    a2 /= l;
    b2 /= l;
    c2 /= l;
    d2 /= l;
    return t => {
      const theta = theta0 * t;
      const s = Math.sin(theta);
      const c = Math.cos(theta);
      x[0] = a1 * c + a2 * s;
      x[1] = b1 * c + b2 * s;
      x[2] = c1 * c + c2 * s;
      x[3] = d1 * c + d2 * s;
      return x;
    };
  }
}
