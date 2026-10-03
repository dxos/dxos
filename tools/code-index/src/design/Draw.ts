//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import type * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';

import {
  Aesthetics,
  Architecture,
  Diagnostics,
  Mermaid,
  MermaidEngine,
  Objective,
  type Scene,
  Score,
  View,
} from '@dxos/diagram';

import * as Compact from './Compact.ts';

/**
 * Lays out and judges compact diagrams. Node only: `MermaidEngine` runs ELK, whose bundled fake
 * worker Bun's CJS interop cannot construct — the Bun CLI reaches this module through a Node child
 * (`draw-main.ts`).
 */

export type Row = Score.Scored & { spread?: number };

export type Judged = {
  readonly name: string;
  readonly mermaid: string;
  readonly overall: number | undefined;
  readonly scores: readonly Row[];
  readonly svg: string;
  readonly layout: string;
};

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** Mean of repeated scores for one scorer, keeping the first error if every run failed. */
const average = (runs: readonly Score.Scored[]): Row => {
  const judged = runs.filter(({ error }) => !error);
  if (judged.length === 0) {
    return runs[0];
  }
  const scores = judged.map(({ score }) => score);
  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return { ...judged[0], score: mean, spread: Math.max(...scores) - Math.min(...scores) };
};

/**
 * Lays out one mermaid source and scores it with the layout objective plus the architecture and
 * aesthetics judges, `runs` times for the judges (they drift about ±0.05 between identical calls).
 * No caption is passed, because a caption biases the judge towards the story it tells.
 */
export const judge = (
  name: string,
  mermaid: string,
  { runs = 1, judges = true }: { runs?: number; judges?: boolean } = {},
): Effect.Effect<Judged, never, DecisionModel.DecisionModel> =>
  Effect.gen(function* () {
    const objects = objectsOf(yield* Effect.promise(() => MermaidEngine.compile(mermaid)));
    const layout = `${View.ascii(objects)}\n\n${View.rows(objects)}`;
    const subject = {
      objects,
      report: Diagnostics.analyze(objects),
      content: Architecture.contentOf(Mermaid.parse(mermaid), { layout }),
    };
    const objective = yield* Score.evaluate(Score.fromObjective(Objective.DEFAULT), subject);
    const judgeRuns = judges
      ? yield* Effect.all(
          Array.from({ length: runs }, () => Score.evaluate([Architecture.judge(), Aesthetics.judge()], subject)),
          { concurrency: 'unbounded' },
        )
      : [];
    const judged =
      judgeRuns.length > 0 ? judgeRuns[0].map((_, index) => average(judgeRuns.map((run) => run[index]))) : [];
    const scores: Row[] = [...objective, ...judged];
    return { name, mermaid, overall: Score.overall(scores), scores, svg: svgOf(objects), layout };
  });

/** Every variant judged, best overall first; a variant whose judges all failed sorts last. */
export const best = (
  diagrams: readonly Compact.Diagram[],
  options: { runs?: number; judges?: boolean } = {},
): Effect.Effect<Judged[], never, DecisionModel.DecisionModel> =>
  Effect.forEach(diagrams, (diagram) => judge(diagram.variant.name, diagram.mermaid, options), {
    concurrency: 4,
  }).pipe(Effect.map((judged) => [...judged].sort((left, right) => (right.overall ?? -1) - (left.overall ?? -1))));

const escape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A standalone SVG of a laid-out scene: frames, boxes, connectors and labels, styled inline so any
 * browser shows it as is. Deliberately plain — plugin-illustrator's `SceneSvg` is the full renderer,
 * and pulling a React plugin into a CLI to draw rectangles is not worth its dependency graph.
 */
export const svgOf = (objects: readonly Scene.WorldObject[]): string => {
  const drawing = View.extract(objects);
  const pad = 16;
  const { x, y, w, h } = drawing.bounds;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - pad} ${y - pad} ${w + 2 * pad} ${h + 2 * pad}" ` +
      `width="${Math.round(w + 2 * pad)}" height="${Math.round(h + 2 * pad)}" font-family="ui-sans-serif, system-ui, sans-serif">`,
    '<defs><marker id="head" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#555"/></marker></defs>',
    `<rect x="${x - pad}" y="${y - pad}" width="${w + 2 * pad}" height="${h + 2 * pad}" fill="#fff"/>`,
  ];
  for (const box of drawing.boxes.filter((entry) => entry.frame)) {
    const { rect } = box;
    parts.push(
      `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" rx="6" fill="#f4f6fb" stroke="#9aa5c0" stroke-dasharray="4 3"/>`,
    );
    if (box.label) {
      parts.push(
        `<text x="${rect.x + 8}" y="${rect.y + 16}" font-size="12" fill="#56607a">${escape(box.label)}</text>`,
      );
    }
  }
  for (const path of drawing.paths) {
    const points = path.points.map((point) => `${point.x},${point.y}`).join(' ');
    parts.push(`<polyline points="${points}" fill="none" stroke="#555" stroke-width="1.3" marker-end="url(#head)"/>`);
    if (path.label && path.points.length > 1) {
      const middle = Math.floor((path.points.length - 1) / 2);
      const [start, end] = [path.points[middle], path.points[middle + 1]];
      parts.push(
        `<text x="${(start.x + end.x) / 2 + 4}" y="${(start.y + end.y) / 2 - 4}" font-size="11" fill="#333">${escape(path.label)}</text>`,
      );
    }
  }
  for (const box of drawing.boxes.filter((entry) => !entry.frame)) {
    const { rect } = box;
    parts.push(
      `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" rx="4" fill="#fff" stroke="#3b4a6b" stroke-width="1.3"/>`,
    );
    if (box.label) {
      parts.push(
        `<text x="${rect.x + rect.w / 2}" y="${rect.y + rect.h / 2 + 4}" font-size="13" text-anchor="middle" fill="#111">${escape(box.label)}</text>`,
      );
    }
  }
  parts.push('</svg>');
  return parts.join('\n');
};

/** A markdown table of a judged diagram's scores. */
export const scoreTable = (judged: Judged): string =>
  [
    `**${judged.name}** — overall ${judged.overall?.toFixed(2) ?? '—'}`,
    '',
    '| kind | rule | score |',
    '| --- | --- | --- |',
    ...judged.scores.map(
      ({ kind, id, score, error, spread }) =>
        `| ${kind} | ${id} | ${error ? `error: ${error}` : `${score.toFixed(2)}${spread !== undefined ? ` ±${(spread / 2).toFixed(2)}` : ''}`} |`,
    ),
  ].join('\n');
