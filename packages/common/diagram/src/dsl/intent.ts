//
// Copyright 2026 DXOS.org
//

//
// The text a drawing was, or could have been, written as. A drawing is stored as records and prints as boxes,
// which is where every coordinate and wrapper grid shows; an author writes `diagram kind=grid`, which says the
// same drawing as groups, nodes and edges. This goes from the first back to the second, and refuses rather than
// approximates: it lowers its own answer and compares what the two draw, so the text it returns is never a
// different picture.
//

import * as GridEngine from '../grid-engine.ts';
import type * as Scene from '../scene.ts';
import { parse } from './parse.ts';
import { formatGridDiagram } from './print.ts';

/** The intent of a drawing: its text, or why a grid diagram cannot say it. Exactly one is present. */
export type Intent = { text: string; reasons?: undefined } | { text?: undefined; reasons: readonly string[] };

/** Stable text for a value, so two values compare by what they hold and not by key order. */
const canon = (value: unknown): string =>
  JSON.stringify(value, (_key, entry: unknown) =>
    entry !== null && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)))
      : entry,
  );

/** The fields two records disagree on. */
const differing = (left: Readonly<Record<string, unknown>>, right: Readonly<Record<string, unknown>>): string[] =>
  [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((name) => canon(left[name]) !== canon(right[name]))
    .sort();

/** What `written` shows that `said` does not show the same way, in words an author can act on. */
const differences = (written: GridEngine.Drawn, said: GridEngine.Drawn): string[] => {
  const reasons: string[] = [];
  if (written.scale !== said.scale) {
    reasons.push(`The object is scaled by ${written.scale}; a grid diagram draws at 1.`);
  }
  if (written.others > 0) {
    reasons.push(`${written.others} element(s) are neither a box nor a connector.`);
  }
  const saidLeaves = new Map(said.leaves.map((leaf) => [leaf.key, leaf]));
  for (const leaf of written.leaves) {
    const other = saidLeaves.get(leaf.key);
    if (!other) {
      reasons.push(`"${leaf.key}" has no statement that draws it.`);
    } else if (canon(leaf) !== canon(other)) {
      reasons.push(`"${leaf.key}" differs in: ${differing(leaf, other).join(', ')}.`);
    }
    saidLeaves.delete(leaf.key);
  }
  for (const key of saidLeaves.keys()) {
    reasons.push(`"${key}" would be drawn, and the drawing has no such box.`);
  }
  const frames = (drawn: GridEngine.Drawn) => drawn.frames.map(canon).sort();
  if (canon(frames(written)) !== canon(frames(said))) {
    reasons.push('A frame drawn round a group differs.');
  }
  if (written.arrows.length !== said.arrows.length) {
    reasons.push(`${written.arrows.length} connector(s) are drawn and ${said.arrows.length} can be said.`);
  } else {
    written.arrows.forEach((arrow, index) => {
      const other = said.arrows[index];
      if (canon(arrow) !== canon(other)) {
        reasons.push(`The connector ${arrow.from} to ${arrow.to} differs in: ${differing(arrow, other).join(', ')}.`);
      }
    });
  }
  return reasons;
};

/**
 * The `diagram kind=grid` text that draws what `scene` draws, or the reasons there is none. The text is checked
 * before it is returned: it is parsed and lowered again, and both drawings must show the same boxes in the same
 * frames, the same group frames and the same connectors. The grids themselves may differ, since they are how a
 * drawing is said: a heading and its members' grid take the engine's ids, and a box that drew nothing becomes an
 * empty group.
 */
export const printIntent = (scene: Scene.Scene): Intent => {
  const [object] = scene.objects;
  if (scene.objects.length !== 1) {
    return { reasons: [`A grid diagram is one object; the drawing holds ${scene.objects.length}.`] };
  }
  const diagram = GridEngine.infer(object);
  if (!diagram) {
    return { reasons: ['No single grid holds the drawing.'] };
  }
  const text = formatGridDiagram(diagram);
  const { commands, problems } = parse(text);
  const errors = problems.filter(({ severity }) => severity === 'error').map(({ message }) => message);
  const [command] = commands;
  if (errors.length > 0 || commands.length !== 1 || command.op !== 'upsert-object') {
    return { reasons: errors.length > 0 ? errors : ['The diagram does not lower to one object.'] };
  }
  const reasons = differences(GridEngine.drawn(object), GridEngine.drawn(command.object));
  return reasons.length > 0 ? { reasons } : { text };
};
