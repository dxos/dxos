//
// Copyright 2020 DXOS.org
//

import React from 'react';
import {
  Circle,
  Ellipse, Line,
  Path,
  perlin2,
  Point2D,
  Rect,
  RegularPolygon,
  RoundedRect,
  SCanvas,
  SimplePath
} from 'solandra';
import { FullScreenCanvas } from 'solandra-react';
import { add, distance, scale } from 'solandra/cjs/vectors';

// https://github.com/jamesporter/solandra

const seed = 1;

export default {
  title: 'Solandra'
};

export const Cards = () => <FullScreenCanvas playing seed={seed} sketch={cards} />;

// https://solandra.netlify.app/view?sketch=24&category=API%20Samples
const cards = (p: SCanvas) => {
  p.forTiling({ n: 6, type: 'square', margin: 0.05 }, ([x, y], [dX, dY]) => {
    p.withClipping(
      new RoundedRect({
        at: [x + dX / 6, y + dX / 4],
        w: (dX * 2) / 3,
        h: dY / 2,
        r: dX / 12,
      }),
      () => {
        p.setFillColor(175 + x * 60 + y * 100, y * 40 + 60, 40);
        p.fill(
          new Rect({
            at: [x + dX / 6, y + dX / 4],
            w: (dX * 2) / 3,
            h: dY / 2,
          })
        );

        p.setFillColor(0, 0, 100, 0.4);
        p.times(5, () =>
          p.fill(
            new Ellipse({
              at: p.perturb({ at: [x + dX / 2, y + dY / 2] }),
              w: dX / 2,
              h: dX / 2,
            })
          )
        );
      }
    );
  });
};

export const Script = () => <FullScreenCanvas playing seed={seed} sketch={script} />;

// https://solandra.netlify.app/view?sketch=3&category=Highlights
const script = (p: SCanvas) => {
  const { bottom, aspectRatio } = p.meta;

  p.range({ from: 0.1, to: bottom - 0.1, n: 5 }, m => {
    let points: Point2D[] = [];
    p.setStrokeColor(215, 40, 30 - 30 * m);
    p.range({ from: 0.1, to: 0.9, n: 60 }, n => {
      points.push([
        n + perlin2(n * 45 + m * 67, 20) / 12,
        m + perlin2(n * 100 + m * 100, 0.1) / (6 * aspectRatio),
      ]);
    });
    p.draw(SimplePath.withPoints(points).chaiken({ n: 4 }));
  });
};

export const Doodles = () => <FullScreenCanvas playing seed={seed} sketch={doodles} />;

// https://solandra.netlify.app/view?sketch=4&category=Highlights
const doodles = (p: SCanvas) => {
  p.forTiling({ n: 7, type: 'square', margin: 0.1 }, ([x, y], [dX, dY]) => {
    const center = add([x, y], scale([dX, dY], 0.5));
    let path = Path.startAt(center);
    p.setStrokeColor(100 * x + y * 33, 60 + 45 * y, 40);
    p.lineWidth = 0.005;
    p.withRandomOrder(p.aroundCircle, { at: center, r: dX / 2.8, n: 7 }, pt =>
      path.addCurveTo(pt)
    );
    path.addCurveTo(center);
    p.draw(path);
  });
};

export const Hex = () => <FullScreenCanvas playing seed={seed} sketch={hex} />;

// https://solandra.netlify.app/view?sketch=4&category=Advanced%20Paths
const hex = (p: SCanvas) => {
  p.background(0, 0, 85);
  p.setFillColor(0, 0, 20);
  p.fill(new RegularPolygon({ n: 6, at: p.meta.center, r: 0.44 }));
  new RegularPolygon({ n: 6, at: p.meta.center, r: 0.4 }).path
    .subdivide({ m: 1, n: 5 })
    .forEach((s, i) => {
      p.setFillColor(i * 20, 50, 50)
      p.fill(s)
    });
  new RegularPolygon({ n: 6, at: p.meta.center, r: 0.4 }).path
    .subdivide({ m: 0, n: 3 })
    .forEach((s, i) => {
      p.setFillColor(i * 20, 50, 50, 0.5)
      p.fill(s)
    });

  p.setFillColor(60, 50, 20, 0.1);
  p.fill(
    new RegularPolygon({ n: 6, at: p.meta.center, r: 0.4 }).path.subdivide({
      m: 2,
      n: 5,
    })[0]
  );
};

export const NoiseField = () => <FullScreenCanvas playing seed={seed} sketch={noiseField} />;

// https://solandra.netlify.app/view?sketch=0&category=Randomness%20and%20Noise
const noiseField = (p: SCanvas) => {
  const delta = 0.01;
  const s = 8;
  p.lineWidth = 0.0025;

  p.times(50, n => {
    p.setStrokeColor(195 + n / 12.5, 90, 30, 0.7);
    let pt = p.randomPoint();
    const sp = SimplePath.startAt(pt);
    while (true) {
      const a = Math.PI * 2 * perlin2(pt[0] * s, pt[1] * s);
      const nPt = add(pt, [delta * Math.cos(a), delta * Math.sin(a)]);
      if (p.inDrawing(nPt)) {
        pt = nPt;
        sp.addPoint(nPt);
      } else {
        break
      }
    }
    p.draw(sp.chaiken({ n: 2 }));
  });
};

export const Curls = () => <FullScreenCanvas playing seed={seed} sketch={curls} />;

// https://solandra.netlify.app/view?sketch=30&category=API%20Samples
const curls = (p: SCanvas) => {
  const baseColor = p.uniformRandomInt({ from: 150, to: 250 });
  p.background(baseColor, 20, 90);
  p.lineStyle = {
    cap: 'round',
  };
  p.setFillColor(baseColor, 60, 30);
  p.setStrokeColor(baseColor - 40, 80, 35, 0.9);
  p.times(p.uniformRandomInt({ from: 20, to: 100 }), () => {
    const c = p.randomPoint();
    let tail = p.perturb({ at: c, magnitude: 0.2 });
    while (distance(c, tail) < 0.1) {
      tail = p.perturb({ at: c, magnitude: 0.2 });
    }
    p.fill(
      new Circle({
        at: c,
        r: 0.015,
      })
    );
    p.fill(
      new Circle({
        at: tail,
        r: 0.015,
      })
    );
    p.draw(
      Path.startAt(c).addCurveTo(tail, {
        curveSize: p.gaussian({
          mean: 2,
          sd: 1,
        }),
      })
    );
  });
};

export const Clipping = () => <FullScreenCanvas playing seed={seed} sketch={clipping} />;

// https://solandra.netlify.app/view?sketch=22&category=API%20Samples
const clipping = (p: SCanvas) => {
  const { center, bottom, right } = p.meta;
  const size = Math.min(bottom, right) * 0.8;
  p.background(120 + p.t * 50, 40, 90);
  p.lineWidth = 0.005;
  p.range({ from: 1, to: 4, n: 4 }, n =>
    p.withTranslation([0.037 * n * n, bottom * 0.037 * n * n], () =>
      p.withScale([0.1 * n, 0.1 * n], () =>
        p.withClipping(new Ellipse({ at: center, w: size, h: size }), () =>
          p.forTiling(
            { n: 60 / (8 - n), type: 'square' },
            ([x, y], [dX, dY]) => {
              p.setStrokeColor(120 + x * 120 + p.t * 50, 90 - 20 * y, 40)
              p.proportionately([
                [1, () => p.draw(new Line([x, y], [x + dX, y + dY]))],
                [2, () => p.draw(new Line([x + dX, y], [x, y + dY]))],
                [1, () => p.draw(new Line([x, y], [x, y + dY]))],
              ])
            }
          )
        )
      )
    )
  );
};
