//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { REFERENCE } from '../util.ts';
import { BOX, type Commands, LINE_HEIGHT, MAX_LINES, captionRun, lineCount, makeScenes } from './drawings.ts';

type Element = Extract<Commands[number], { op: 'upsert-object' }>['object']['elements'][number];
type Box = Extract<Element, { kind: 'rect' | 'ellipse' | 'diamond' | 'triangle' }>;

const elementsOf = (commands: Commands): Element[] =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [...command.object.elements] : []));

// The roadmap's reference-date hairline is the one box without a label.
const boxesOf = (commands: Commands): Box[] =>
  elementsOf(commands).filter(
    (element): element is Box =>
      (element.kind === 'rect' || element.kind === 'ellipse' || element.kind === 'diamond') && element.text !== '',
  );

const overlaps = (left: Box, right: Box) =>
  left.x < right.x + right.w && right.x < left.x + left.w && left.y < right.y + right.h && right.y < left.y + left.h;

// The quarter's first day, the reference date and its last day, so the roadmap holds wherever "today" falls.
const DATES = [REFERENCE, '2026-10-01T00:00:00Z', '2026-12-31T00:00:00Z'];

describe('Alien Labs drawings', () => {
  test('a box holds three lines of its label', ({ expect }) => {
    expect(BOX.h).toBeGreaterThanOrEqual(MAX_LINES * LINE_HEIGHT);
  });

  test('every box is the same size and fits its label', ({ expect }) => {
    for (const [key, commands] of DATES.flatMap((date) => Object.entries(makeScenes(new Date(date))))) {
      for (const box of boxesOf(commands)) {
        const where = `${key}/${box.id}`;
        expect(box.h, where).toBe(BOX.h);
        // Roadmap bars span their dates; every other box is the standard width.
        if (!(key === 'roadmap' && !box.id.startsWith('lane-'))) {
          expect(box.w, where).toBe(BOX.w);
        }
        expect(lineCount(box.text ?? '', box.w), where).toBeLessThanOrEqual(MAX_LINES);
      }
    }
  });

  test('no two boxes overlap', ({ expect }) => {
    for (const [key, commands] of DATES.flatMap((date) => Object.entries(makeScenes(new Date(date))))) {
      const boxes = boxesOf(commands);
      for (const [index, box] of boxes.entries()) {
        for (const other of boxes.slice(index + 1)) {
          expect(overlaps(box, other), `${key}: ${box.id} and ${other.id}`).toBe(false);
        }
      }
    }
  });

  test('a caption on a level link has room to show in full', ({ expect }) => {
    let checked = 0;
    for (const [key, commands] of Object.entries(makeScenes(new Date(REFERENCE)))) {
      const boxes = new Map(boxesOf(commands).map((box) => [box.id, box]));
      for (const element of elementsOf(commands)) {
        if (element.kind !== 'arrow' || !element.text || !element.from || !element.to) {
          continue;
        }
        const from = boxes.get(element.from);
        const to = boxes.get(element.to);
        expect(from && to, `${key}/${element.id}`).toBeTruthy();
        // A canvas link is straight between its boxes, so only one between boxes in a row runs level; the canvas
        // shortens a caption only on a level run.
        if (!from || !to || from.y !== to.y) {
          continue;
        }
        const [left, right] = from.x < to.x ? [from, to] : [to, from];
        expect(right.x - (left.x + left.w), `${key}/${element.id}`).toBeGreaterThanOrEqual(captionRun(element.text));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5);
  });
});
