//
// Copyright 2026 DXOS.org
//

import { expand } from './expand.ts';
import { type Graph } from './graph.ts';
import { layout } from './layout.ts';
import { resolveLinks } from './links.ts';
import { type NetworkTemplate } from './template.ts';

/** Expands, lays out and links a template. */
export const buildGraph = (template: NetworkTemplate, seed: number): Graph =>
  resolveLinks(layout(expand(template, seed), seed, template.layout), template.links ?? [], seed);
