//
// Copyright 2026 DXOS.org
//

//
// Renders the diagram corpus (`docs/diagrams/*.mmd`) headlessly through the SVG variant, writing a
// standalone `.svg` beside each source, and prints the Tier-1 report per diagram. With
// `--scoreboard` it prints the Tier-2 table instead (every flowchart strategy × soft metrics).
// Run: `moon run plugin-illustrator:render-diagrams [-- --scoreboard]` (vite-node; bun cannot load elkjs).
//

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SceneSvg } from '../src/components/SceneSvg';
import * as Diagnostics from '../src/model/diagnostics';
import * as Mermaid from '../src/model/mermaid';
import * as MermaidEngine from '../src/model/mermaid-engine';
import type * as Scene from '../src/model/scene';
import { GRID } from '../src/model/uml-grid';

const DIAGRAMS = join(dirname(fileURLToPath(import.meta.url)), '../docs/diagrams');

/**
 * The renderer styles with Tailwind utilities; a file on disk has no stylesheet, so the export
 * inlines the handful it uses (light theme, Tailwind's neutral palette).
 */
const STYLE = `
  svg { font-family: ui-sans-serif, system-ui, sans-serif; color: #262626; background: #ffffff; }
  .stroke-current { stroke: currentColor; }
  .fill-current { fill: currentColor; }
  .fill-transparent { fill: transparent; }
  .fill-none { fill: none; }
  .stroke-none { stroke: none; }
  .fill-neutral-100 { fill: #f5f5f5; }
  .fill-neutral-800 { fill: #262626; }
  .stroke-neutral-800 { stroke: #262626; }
  svg { --surface-bg: #ffffff; }
  .text-neutral-400 { color: #a3a3a3; }
  .stroke-neutral-500\\/20 { stroke: rgba(115, 115, 115, 0.2); }
`;

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

type Strategy = { id: string; compile: (source: string) => Promise<readonly Scene.Command[]> };

const strategies: Strategy[] = [
  { id: 'layered', compile: async (source) => Mermaid.compile(source) },
  { id: 'elk', compile: (source) => MermaidEngine.compile(source) },
];

/** Standalone SVG: the component's markup plus width/height from its viewBox and the inline styles. */
const toSvg = (objects: readonly Scene.WorldObject[]): string => {
  const markup = renderToStaticMarkup(<SceneSvg objects={objects} grid={GRID} />);
  const viewBox = /viewBox="([^"]+)"/.exec(markup)?.[1].split(' ').map(Number) ?? [0, 0, 0, 0];
  return markup
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBox[2]}" height="${viewBox[3]}" `)
    .replace('<defs>', `<style>${STYLE}</style><defs>`);
};

const sources = readdirSync(DIAGRAMS)
  .filter((file) => file.endsWith('.mmd'))
  .sort()
  .map((file) => ({ name: basename(file, '.mmd'), source: readFileSync(join(DIAGRAMS, file), 'utf8') }));

if (process.argv.includes('--scoreboard')) {
  const rows: Record<string, Record<string, string>> = {};
  for (const { name, source } of sources) {
    for (const strategy of strategies) {
      const { metrics } = Diagnostics.analyze(objectsOf(await strategy.compile(source)));
      const errors = metrics.overlaps + metrics.routesThroughNodes + metrics.labelOverflows;
      rows[`${name} / ${strategy.id}`] = {
        errors: String(errors),
        crossings: String(metrics.crossings),
        bends: String(metrics.bends),
        area: `${metrics.width}×${metrics.height}`,
      };
    }
  }
  console.table(rows);
} else {
  let failed = false;
  for (const { name, source } of sources) {
    const objects = objectsOf(await MermaidEngine.compile(source));
    const report = Diagnostics.analyze(objects);
    writeFileSync(join(DIAGRAMS, `${name}.svg`), toSvg(objects));
    const { crossings, bends, nodes, connectors } = report.metrics;
    console.log(`${name}: ${nodes} nodes, ${connectors} connectors, ${crossings} crossings, ${bends} bends`);
    for (const diagnostic of report.diagnostics) {
      console.log(`  ${diagnostic.severity}: ${diagnostic.message}`);
    }
    failed ||= Diagnostics.errors(report).length > 0;
  }
  process.exitCode = failed ? 1 : 0;
}
