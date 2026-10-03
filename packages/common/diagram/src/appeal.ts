//
// Copyright 2026 DXOS.org
//

//
// How a drawing reads to a person, measured: one evaluator per `code` or `both` rule in
// `rules/DIAGRAM.mdl`, each a score in [0, 1] (1 is good) computed from the scene's geometry. The
// `vision` half of the library is asked of a decision model shown the rendered page (`judge`), so a
// geometric measure can be checked against what a reader sees.
//

import type * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';

import * as Architecture from './architecture.ts';
import * as Diagnostics from './diagnostics.ts';
import * as Layout from './layout.ts';
import * as Objective from './objective.ts';
import * as Rules from './rules.ts';
import type * as Scene from './scene.ts';
import type * as Score from './score.ts';
import * as View from './view.ts';

type Point = Scene.Point;
type Rect = View.Box['rect'];

/** Everything an evaluator reads: the scene, its geometry and its defect report, computed once. */
export type Subject = {
  readonly objects: readonly Scene.WorldObject[];
  readonly drawing: View.Drawing;
  readonly report: Diagnostics.Report;
};

export type Measure = { readonly score: number; readonly detail: string };

export type Evaluator = (subject: Subject) => Measure;

/** Coordinates closer than this are "the same line" for alignment. */
const ALIGNED = 1;

/** Line height over font size as the renderers draw text: `s` is 13 units on a 26-unit line. */
const LINE_PER_EM = 2;

/** The gap below which two boxes count as adjacent, so a short arrow between them is never a detour. */
const DIRECT_GAP = 64;

/** Coordinates differing by more than `ALIGNED` but less than this are a near miss. */
const NEAR_MISS = 12;

const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

/** Coefficient of variation; 0 for fewer than two values or a zero mean. */
const variation = (values: readonly number[]) => {
  const average = mean(values);
  if (values.length < 2 || average === 0) {
    return 0;
  }
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2))) / average;
};

/** 1 at no penalty, 0.5 at `half`, falling off hyperbolically. */
const soften = (penalty: number, half = 1) => 1 / (1 + Math.max(0, penalty) / half);

const share = (outcomes: readonly boolean[], empty = 1) =>
  outcomes.length ? outcomes.filter(Boolean).length / outcomes.length : empty;

const percent = (value: number) => `${Math.round(value * 100)}%`;

const center = ({ x, y, w, h }: Rect): Point => ({ x: x + w / 2, y: y + h / 2 });

const contains = (outer: Rect, inner: Rect) =>
  outer.x <= inner.x + ALIGNED &&
  outer.y <= inner.y + ALIGNED &&
  outer.x + outer.w >= inner.x + inner.w - ALIGNED &&
  outer.y + outer.h >= inner.y + inner.h - ALIGNED;

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Border-to-border gap between two rects; 0 when they touch or overlap. */
const gap = (a: Rect, b: Rect) =>
  Math.hypot(
    Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)),
    Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)),
  );

const pathLength = (points: readonly Point[]) =>
  points
    .slice(1)
    .reduce((total, point, index) => total + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);

const bends = (points: readonly Point[]) =>
  points.slice(1, -1).filter((point, index) => {
    const [previous, next] = [points[index], points[index + 2]];
    const straight =
      (Math.abs(previous.x - point.x) < ALIGNED && Math.abs(point.x - next.x) < ALIGNED) ||
      (Math.abs(previous.y - point.y) < ALIGNED && Math.abs(point.y - next.y) < ALIGNED);
    return !straight;
  }).length;

/** Overlap of two intervals' projections, positive when they share some extent. */
const overlap = (lo1: number, hi1: number, lo2: number, hi2: number) => Math.min(hi1, hi2) - Math.max(lo1, lo2);

/** Which side of a rect a point lies on, for a point on or just outside its border. */
const sideOf = (point: Point, { x, y, w, h }: Rect): 'top' | 'bottom' | 'left' | 'right' => {
  const distances = {
    top: Math.abs(point.y - y),
    bottom: Math.abs(point.y - y - h),
    left: Math.abs(point.x - x),
    right: Math.abs(point.x - x - w),
  };
  return (Object.entries(distances) as [keyof typeof distances, number][]).reduce((best, entry) =>
    entry[1] < best[1] ? entry : best,
  )[0];
};

const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;

const nodesOf = ({ drawing }: Subject) => drawing.boxes.filter(({ frame }) => !frame);
const framesOf = ({ drawing }: Subject) => drawing.boxes.filter(({ frame }) => frame);

/** Connectors that join two distinct boxes, which are the ones rules about arrows are about. */
const edgesOf = ({ drawing }: Subject) =>
  drawing.paths.filter(
    (path): path is View.Path & { from: View.Box; to: View.Box } =>
      path.from !== undefined && path.to !== undefined && path.from !== path.to && path.points.length >= 2,
  );

/** The smallest frame enclosing a box, its innermost group. */
const groupOf = (box: View.Box, frames: readonly View.Box[]) =>
  frames
    .filter((frame) => frame !== box && contains(frame.rect, box.rect))
    .reduce<View.Box | undefined>(
      (best, frame) => (!best || frame.rect.w * frame.rect.h < best.rect.w * best.rect.h ? frame : best),
      undefined,
    );

/** Every frame enclosing a box, outermost first. */
const ancestorsOf = (box: View.Box, frames: readonly View.Box[]) =>
  frames
    .filter((frame) => frame !== box && contains(frame.rect, box.rect))
    .sort((a, b) => b.rect.w * b.rect.h - a.rect.w * a.rect.h);

/** Times a polyline crosses a rect's border: entries plus exits, counted at segment ends inside vs. outside. */
const borderCrossings = (points: readonly Point[], rect: Rect) => {
  const inside = (point: Point) =>
    point.x > rect.x + ALIGNED &&
    point.x < rect.x + rect.w - ALIGNED &&
    point.y > rect.y + ALIGNED &&
    point.y < rect.y + rect.h - ALIGNED;
  let crossings = 0;
  for (let index = 1; index < points.length; index++) {
    if (inside(points[index]) !== inside(points[index - 1])) {
      crossings++;
    }
  }
  return crossings;
};

/** The main direction of the drawing: the axis and sign most connectors' net displacement runs along. */
const dominantFlow = (edges: readonly { from: View.Box; to: View.Box }[]) => {
  const totals = { down: 0, up: 0, right: 0, left: 0 };
  for (const { from, to } of edges) {
    const [start, end] = [center(from.rect), center(to.rect)];
    const [dx, dy] = [end.x - start.x, end.y - start.y];
    totals[Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : dx > 0 ? 'right' : 'left']++;
  }
  return (Object.entries(totals) as [keyof typeof totals, number][]).reduce((best, entry) =>
    entry[1] > best[1] ? entry : best,
  )[0];
};

/** Code evaluators, keyed by rule id; every `code` and `both` rule in the library has one. */
export const EVALUATORS: Readonly<Record<string, Evaluator>> = {
  'no-edge-crossings': ({ report }) => ({
    score: soften(report.metrics.crossings, 2),
    detail: `${report.metrics.crossings} crossings`,
  }),

  'no-edge-through-node': ({ report }) => ({
    score: report.metrics.routesThroughNodes === 0 ? 1 : 0,
    detail: `${report.metrics.routesThroughNodes} arrows through boxes`,
  }),

  'no-shared-trunks': ({ report }) => ({
    score: soften(report.metrics.edgeOverlaps),
    detail: `${report.metrics.edgeOverlaps} arrow pairs share a line`,
  }),

  'edges-head-toward-target': (subject) => {
    // Against the gap between the boxes rather than between the arrow's own ends, so a route that loops
    // round the page, or joins boxes placed far apart, reads as the detour it looks like.
    const ratios = edgesOf(subject).map(({ points, from, to }) => {
      const across =
        Math.max(0, Math.max(from.rect.x, to.rect.x) - Math.min(from.rect.x + from.rect.w, to.rect.x + to.rect.w)) +
        Math.max(0, Math.max(from.rect.y, to.rect.y) - Math.min(from.rect.y + from.rect.h, to.rect.y + to.rect.h));
      return pathLength(points) / Math.max(across, DIRECT_GAP);
    });
    const direct = share(ratios.map((ratio) => ratio <= 2));
    const excess = mean(ratios.map((ratio) => Math.max(0, ratio - 2)));
    return {
      score: direct * soften(excess, 2),
      detail: `${percent(direct)} direct, mean excess ×${excess.toFixed(2)}`,
    };
  },

  'few-bends': (subject) => {
    const excess = edgesOf(subject).map(({ points, from, to }) => {
      const aligned =
        overlap(from.rect.x, from.rect.x + from.rect.w, to.rect.x, to.rect.x + to.rect.w) > 0 ||
        overlap(from.rect.y, from.rect.y + from.rect.h, to.rect.y, to.rect.y + to.rect.h) > 0;
      return Math.max(0, bends(points) - (aligned ? 0 : 1));
    });
    const average = mean(excess);
    return { score: soften(average), detail: `${average.toFixed(2)} excess bends per arrow` };
  },

  'straight-when-aligned': (subject) => {
    const facing = edgesOf(subject).filter(
      ({ from, to }) =>
        overlap(from.rect.x, from.rect.x + from.rect.w, to.rect.x, to.rect.x + to.rect.w) > 0 ||
        overlap(from.rect.y, from.rect.y + from.rect.h, to.rect.y, to.rect.y + to.rect.h) > 0,
    );
    const straight = share(facing.map(({ points }) => bends(points) === 0));
    return { score: straight, detail: `${percent(straight)} of ${facing.length} facing pairs straight` };
  },

  'uniform-edge-length': (subject) => {
    const cv = variation(edgesOf(subject).map(({ points }) => pathLength(points)));
    return { score: 1 - Math.min(1, cv), detail: `length CV ${cv.toFixed(2)}` };
  },

  'consistent-flow': (subject) => {
    const edges = edgesOf(subject).filter(({ style }) => style?.head !== 'triangle');
    const flow = dominantFlow(edges);
    const withFlow = share(
      edges.map(({ from, to }) => {
        const [start, end] = [center(from.rect), center(to.rect)];
        return flow === 'down'
          ? end.y > start.y
          : flow === 'up'
            ? end.y < start.y
            : flow === 'right'
              ? end.x > start.x
              : end.x < start.x;
      }),
    );
    return { score: withFlow, detail: `${percent(withFlow)} of arrows run ${flow}` };
  },

  'continuous-paths': (subject) => {
    const edges = edgesOf(subject);
    const scores = nodesOf(subject).flatMap((node) => {
      const incoming = edges.filter(({ to }) => to === node);
      const outgoing = edges.filter(({ from }) => from === node);
      if (incoming.length !== 1 || outgoing.length !== 1) {
        return [];
      }
      const entry = sideOf(incoming[0].points[incoming[0].points.length - 1], node.rect);
      const exit = sideOf(outgoing[0].points[0], node.rect);
      return [exit === OPPOSITE[entry] ? 1 : exit === entry ? 0 : 0.5];
    });
    return { score: scores.length ? mean(scores) : 1, detail: `${scores.length} pass-through boxes` };
  },

  'grid-alignment': (subject) => {
    const centers = nodesOf(subject).map(({ rect }) => center(rect));
    const aligned = centers.map(
      (point) =>
        centers.filter((other) => other !== point && Math.abs(other.x - point.x) < ALIGNED).length >= 2 ||
        centers.filter((other) => other !== point && Math.abs(other.y - point.y) < ALIGNED).length >= 2,
    );
    return { score: share(aligned), detail: `${percent(share(aligned))} of boxes in a line of three` };
  },

  'no-near-misses': (subject) => {
    const nodes = nodesOf(subject);
    let misses = 0;
    for (let index = 0; index < nodes.length; index++) {
      for (const other of nodes.slice(index + 1)) {
        const [a, b] = [nodes[index].rect, other.rect];
        const offsets = [
          center(a).x - center(b).x,
          center(a).y - center(b).y,
          a.x - b.x,
          a.y - b.y,
          a.x + a.w - b.x - b.w,
          a.y + a.h - b.y - b.h,
        ].map(Math.abs);
        if (offsets.some((offset) => offset > ALIGNED && offset < NEAR_MISS)) {
          misses++;
        }
      }
    }
    return { score: soften(misses, 2), detail: `${misses} near-aligned pairs` };
  },

  'frames-nested': (subject) => {
    const frames = framesOf(subject);
    let partial = 0;
    for (let index = 0; index < frames.length; index++) {
      for (const other of frames.slice(index + 1)) {
        const [a, b] = [frames[index].rect, other.rect];
        if (intersects(a, b) && !contains(a, b) && !contains(b, a)) {
          partial++;
        }
      }
    }
    return { score: partial === 0 ? 1 : 0, detail: `${partial} partly overlapping frames` };
  },

  'frames-aligned': (subject) => {
    const frames = framesOf(subject);
    const aligned = frames.map(({ rect }) =>
      frames.some(
        (other) =>
          other.rect !== rect &&
          [
            [rect.y, other.rect.y],
            [rect.y + rect.h, other.rect.y + other.rect.h],
            [rect.x, other.rect.x],
            [rect.x + rect.w, other.rect.x + other.rect.w],
          ].some(([first, second]) => Math.abs(first - second) < ALIGNED),
      ),
    );
    return {
      score: frames.length < 2 ? 1 : share(aligned),
      detail: `${percent(share(aligned))} of ${frames.length} frames share an edge`,
    };
  },

  'frames-hug-members': (subject) => {
    const frames = framesOf(subject);
    const nodes = nodesOf(subject);
    const fills = frames.flatMap((frame) => {
      const members = nodes.filter((node) => contains(frame.rect, node.rect));
      if (!members.length) {
        return [];
      }
      const [x0, y0] = [Math.min(...members.map(({ rect }) => rect.x)), Math.min(...members.map(({ rect }) => rect.y))];
      const [x1, y1] = [
        Math.max(...members.map(({ rect }) => rect.x + rect.w)),
        Math.max(...members.map(({ rect }) => rect.y + rect.h)),
      ];
      return [((x1 - x0) * (y1 - y0)) / (frame.rect.w * frame.rect.h)];
    });
    const fill = fills.length ? mean(fills) : 1;
    return { score: Math.min(1, fill / 0.5), detail: `members fill ${percent(fill)} of their frames` };
  },

  'few-frame-crossings': (subject) => {
    const frames = framesOf(subject);
    const extra = edgesOf(subject).reduce((total, { points, from, to }) => {
      const [outer, inner] = [ancestorsOf(from, frames), ancestorsOf(to, frames)];
      const required =
        outer.filter((frame) => !inner.includes(frame)).length + inner.filter((frame) => !outer.includes(frame)).length;
      const actual = frames.reduce((sum, frame) => sum + borderCrossings(points, frame.rect), 0);
      return total + Math.max(0, actual - required);
    }, 0);
    return { score: soften(extra, 2), detail: `${extra} unneeded border crossings` };
  },

  'gestalt-cues-agree': (subject) => {
    const nodes = nodesOf(subject);
    const frames = framesOf(subject);
    if (!frames.length || nodes.length < 2) {
      return { score: 1, detail: 'no groups' };
    }
    const agree = nodes.map((node) => {
      const nearest = nodes
        .filter((other) => other !== node)
        .reduce((best, other) => (gap(node.rect, other.rect) < gap(node.rect, best.rect) ? other : best));
      return groupOf(node, frames) === groupOf(nearest, frames);
    });
    return { score: share(agree), detail: `${percent(share(agree))} of boxes nearest a group-mate` };
  },

  'compact-drawing': (subject) => {
    const { bounds } = subject.drawing;
    const area = nodesOf(subject).reduce((total, { rect }) => total + rect.w * rect.h, 0);
    const density = bounds.w * bounds.h > 0 ? area / (bounds.w * bounds.h) : 1;
    return { score: Math.min(1, density / 0.25), detail: `boxes cover ${percent(density)} of the drawing` };
  },

  'balanced-whitespace': (subject) => {
    const { bounds } = subject.drawing;
    const cells = Array.from({ length: 9 }, (_, index): Rect => ({
      x: bounds.x + ((index % 3) * bounds.w) / 3,
      y: bounds.y + (Math.floor(index / 3) * bounds.h) / 3,
      w: bounds.w / 3,
      h: bounds.h / 3,
    }));
    const ink = cells.map((cell) =>
      nodesOf(subject).reduce((total, { rect }) => {
        const [w, h] = [
          overlap(cell.x, cell.x + cell.w, rect.x, rect.x + rect.w),
          overlap(cell.y, cell.y + cell.h, rect.y, rect.y + rect.h),
        ];
        return total + (w > 0 && h > 0 ? w * h : 0);
      }, 0),
    );
    const cv = variation(ink);
    return { score: 1 - Math.min(1, cv / 1.5), detail: `ink CV ${cv.toFixed(2)} across a 3 × 3 grid` };
  },

  'uniform-spacing': (subject) => {
    const nodes = nodesOf(subject);
    const gaps = nodes.map(({ rect }) =>
      Math.min(...nodes.filter((other) => other.rect !== rect).map((other) => gap(rect, other.rect))),
    );
    const cv = variation(gaps.filter(Number.isFinite));
    return { score: 1 - Math.min(1, cv), detail: `nearest-gap CV ${cv.toFixed(2)}` };
  },

  'landscape-aspect': ({ drawing: { bounds } }) => {
    const ratio = bounds.h > 0 ? bounds.w / bounds.h : 1;
    return { score: soften(Math.abs(Math.log(ratio / 1.6))), detail: `aspect ${ratio.toFixed(2)}` };
  },

  'readable-at-page-width': ({ objects, drawing: { bounds } }) => {
    const sizes = objects.flatMap((object) =>
      object.elements.flatMap((element) =>
        element.kind === 'text' || (element.kind === 'rect' && element.text)
          ? [
              (Layout.FONT_METRICS[element.weight ?? (element.kind === 'text' ? 's' : 'm')].lineH / LINE_PER_EM) *
                (object.scale ?? 1),
            ]
          : [],
      ),
    );
    const smallest = sizes.length ? Math.min(...sizes) : 0;
    const scaled = smallest * Math.min(1, 1200 / Math.max(bounds.w, 1));
    return {
      score: sizes.length ? Math.min(1, scaled / 11) : 1,
      detail: `smallest text ${scaled.toFixed(1)}px at 1200 wide`,
    };
  },

  'labels-clear': ({ report }) => {
    const count = report.metrics.textOverlaps + report.metrics.labelOverflows;
    return { score: soften(count), detail: `${count} overlapping or overflowing labels` };
  },

  'labels-attached': (subject) => {
    const labelRects = new Map(Diagnostics.labels(subject.objects).map(({ ref, rect }) => [ref, rect]));
    const paths = subject.drawing.paths;
    const distanceTo = (point: Point, points: readonly Point[]) =>
      Math.min(
        ...points.slice(1).map((end, index) => {
          const start = points[index];
          const [dx, dy] = [end.x - start.x, end.y - start.y];
          const t =
            dx || dy
              ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
              : 0;
          return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
        }),
      );
    const attached = paths.flatMap((path) => {
      const rect = path.label ? labelRects.get(`${path.ref}-label`) : undefined;
      if (!rect) {
        return [];
      }
      const point = center(rect);
      const own = distanceTo(point, path.points);
      return [paths.every((other) => other === path || distanceTo(point, other.points) > own)];
    });
    return {
      score: share(attached),
      detail: `${percent(share(attached))} of ${attached.length} labels nearest their arrow`,
    };
  },
};

/** Measures every code-evaluated rule of a scene. */
export const measure = (
  objects: readonly Scene.WorldObject[],
  rules: readonly Rules.DiagramRule[] = Rules.RULES,
): (Rules.DiagramRule & Measure)[] => {
  const subject: Subject = { objects, drawing: View.extract(objects), report: Diagnostics.analyze(objects) };
  return rules.flatMap((rule) => {
    const evaluator = EVALUATORS[rule.id];
    return rule.evaluator !== 'vision' && evaluator ? [{ ...rule, ...evaluator(subject) }] : [];
  });
};

/** The weighted mean of rule scores: one number for comparing drawings of the same diagram. */
export const overall = (scores: readonly { weight: number; score: number }[]): number => {
  const total = scores.reduce((sum, { weight }) => sum + weight, 0);
  return total ? scores.reduce((sum, { weight, score }) => sum + weight * score, 0) / total : 0;
};

const HOW_TO_SEE =
  'The attached image is an architecture diagram as drawn: boxes are components, dashed frames are groups, and ' +
  'arrows run from a component to what it depends on. Judge how the drawing reads to a person looking at it, ' +
  'not whether the architecture it shows is good.';

/** The library's `vision` and `both` rules as questions for a judge shown the rendered page. */
export const visionRules = (rules: readonly Rules.DiagramRule[] = Rules.RULES): readonly Architecture.Rule[] =>
  rules.flatMap(({ id, title, evaluator, question, criteria }) =>
    evaluator === 'code' || !question
      ? []
      : [
          {
            id,
            key: Rules.keyOf(id),
            description: title,
            instructions: `${HOW_TO_SEE} ${question}`,
            criteria: criteria ?? { true: 'Yes.', false: 'No.' },
          },
        ],
  );

/** The vision rules as one batched judge over the rendered page; a failed call scores every rule as an error. */
export const judge = (
  rules: readonly Rules.DiagramRule[] = Rules.RULES,
): Score.Batch<Architecture.Subject, DecisionModel.DecisionModel> => Architecture.judge(visionRules(rules), 'appeal');

/** The code-evaluated rules as scorers over a scene, for `Score.evaluate` beside the judge. */
export const scorers = (
  rules: readonly Rules.DiagramRule[] = Rules.RULES,
): Score.Scorer<readonly Scene.WorldObject[]>[] =>
  rules.flatMap((rule) =>
    rule.evaluator === 'vision' || !EVALUATORS[rule.id]
      ? []
      : [
          {
            id: rule.id,
            kind: 'appeal',
            description: rule.title,
            evaluate: (objects: readonly Scene.WorldObject[]) =>
              Effect.sync(() => {
                const [measured] = measure(objects, [rule]);
                return { score: measured.score, detail: measured.detail };
              }),
          },
        ],
  );

/**
 * A layout objective that adds the library's appeal to `base`: its hard constraints and costs stay, and
 * every point of appeal a candidate lacks costs `weight` (a crossing costs 3), so the engine prefers the
 * candidate a reader would. Appeal is measured over the code-evaluated rules only.
 */
export const objective = (
  base: Objective.Objective = Objective.DEFAULT,
  { weight = 30, rules = Rules.RULES }: { weight?: number; rules?: readonly Rules.DiagramRule[] } = {},
): Objective.Objective => ({
  constraints: base.constraints,
  costs: [
    ...base.costs,
    {
      id: 'appeal',
      description: 'How far the drawing falls short of the rule library, weighted by evidence.',
      weight,
      measure: ({ objects }) => 1 - overall(measure(objects, rules)),
    },
  ],
});
