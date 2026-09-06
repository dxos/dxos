//
// Copyright 2026 DXOS.org
//

//
// Renders the diagram corpus (`docs/diagrams/*.mmd`) headlessly through the SVG variant, writing a
// standalone `.svg` beside each source, and prints the Tier-1 report per diagram. With
// `--scoreboard` it prints the Tier-2 table instead (every flowchart strategy × soft metrics).
// Run: `moon run plugin-illustrator:render-diagrams [-- --scoreboard]`. For a single source, see `render.ts`.
//

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Diagnostics from '../src/model/diagnostics';
import * as Mermaid from '../src/model/mermaid';
import * as MermaidEngine from '../src/model/mermaid-engine';
import type * as Scene from '../src/model/scene';
import { toStandaloneSvg } from './standalone-svg';

const DIAGRAMS = join(dirname(fileURLToPath(import.meta.url)), '../docs/diagrams');

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

type Strategy = { id: string; compile: (source: string) => Promise<readonly Scene.Command[]> };

const strategies: Strategy[] = [
  { id: 'layered', compile: async (source) => Mermaid.compile(source) },
  { id: 'elk', compile: (source) => MermaidEngine.compile(source) },
];

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
    writeFileSync(join(DIAGRAMS, `${name}.svg`), toStandaloneSvg(objects));
    const { crossings, bends, nodes, connectors } = report.metrics;
    console.log(`${name}: ${nodes} nodes, ${connectors} connectors, ${crossings} crossings, ${bends} bends`);
    for (const diagnostic of report.diagnostics) {
      console.log(`  ${diagnostic.severity}: ${diagnostic.message}`);
    }
    failed ||= Diagnostics.errors(report).length > 0;
  }
  process.exitCode = failed ? 1 : 0;
}
