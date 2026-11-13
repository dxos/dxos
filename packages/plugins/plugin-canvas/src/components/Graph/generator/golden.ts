//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Params } from './space-graph.generator.ts';

/** The deck's own output for the slide's graph (seed 7), written by studio's `export.mjs` from `substrate-view.mjs`. */
export type Golden = {
  center: [number, number];
  r: number;
  params: Params & { picks?: number };
  nodeR: number;
  cells: [number, number][];
  nodes: [number, number][];
  links: [number, number][];
  readers: { id: string; from: [number, number]; toward: [number, number]; picks: number[] }[];
};

export const golden: Golden = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'golden-seed7.json'), 'utf8'),
);
