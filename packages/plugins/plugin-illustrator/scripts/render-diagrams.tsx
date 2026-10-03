//
// Copyright 2026 DXOS.org
//

//
// Renders the diagram corpus (`docs/diagrams/*.mmd`) headlessly through the SVG variant, writing a
// `.dx.svg` beside each source (the picture, carrying the drawing's ECHO objects and its mermaid source, so it
// opens as an image anywhere and imports back as an editable drawing; `--plain` writes a bare `.svg`), and
// prints the Tier-1 report per diagram. With
// `--scoreboard` it prints the Tier-2 table instead (every flowchart strategy × soft metrics).
// Passing `.mmd` paths renders just those files instead of the corpus; `--layering down` (or a comma list of
// `down`, `up`, `free`) restricts the candidate layerings the engine chooses among.
// Run: `moon run plugin-illustrator:render-diagrams [-- --scoreboard] [-- /abs/path/x.mmd …]` (vite-node; bun cannot load elkjs).
//

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Diagnostics, Mermaid, MermaidEngine, type Scene, SVG_SCHEMA } from '@dxos/diagram';

import { DrawingFile, SvgBuilder } from '#model';
import { Drawing } from '#types';

import { toSvgFile } from '../src/components/SceneSvgFile.tsx';

const DIAGRAMS = join(dirname(fileURLToPath(import.meta.url)), '../docs/diagrams');

const layeringArg = process.argv[process.argv.indexOf('--layering') + 1];
const LAYERING = process.argv.includes('--layering')
  ? layeringArg.split(',').filter((value): value is MermaidEngine.Layering => ['down', 'up', 'free'].includes(value))
  : undefined;

const PLAIN = process.argv.includes('--plain');

/** The `.dx.svg` for a compiled diagram: the drawing built in memory as the app would store it. */
const toDxSvg = (
  name: string,
  source: string,
  commands: readonly Scene.Command[],
  objects: readonly Scene.WorldObject[],
) => {
  const canvas = Drawing.makeCanvas({ schema: SVG_SCHEMA });
  SvgBuilder.apply(canvas, commands);
  const drawing = Drawing.make({ name, canvas });
  return DrawingFile.toDxSvg(
    toSvgFile(objects),
    DrawingFile.toPayload({ drawing, canvas, source: { language: 'mermaid', text: source } }),
  );
};

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

type Strategy = { id: string; compile: (source: string) => Promise<readonly Scene.Command[]> };

const strategies: Strategy[] = [
  { id: 'layered', compile: async (source) => Mermaid.compile(source) },
  { id: 'elk', compile: (source) => MermaidEngine.compile(source) },
];

const files = process.argv.slice(2).filter((arg) => arg.endsWith('.mmd'));
const paths =
  files.length > 0
    ? files.map((file) => resolve(file))
    : readdirSync(DIAGRAMS)
        .filter((file) => file.endsWith('.mmd'))
        .sort()
        .map((file) => join(DIAGRAMS, file));
const sources = paths.map((path) => ({
  name: basename(path, '.mmd'),
  source: readFileSync(path, 'utf8'),
  svgPath: path.replace(/\.mmd$/, PLAIN ? '.svg' : '.dx.svg'),
}));

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
  for (const { name, source, svgPath } of sources) {
    const commands = await MermaidEngine.compile(source, LAYERING ? { layering: LAYERING } : {});
    const objects = objectsOf(commands);
    const report = Diagnostics.analyze(objects);
    writeFileSync(svgPath, PLAIN ? toSvgFile(objects) : toDxSvg(name, source, commands, objects));
    const { crossings, bends, nodes, connectors } = report.metrics;
    console.log(`${name}: ${nodes} nodes, ${connectors} connectors, ${crossings} crossings, ${bends} bends`);
    for (const diagnostic of report.diagnostics) {
      console.log(`  ${diagnostic.severity}: ${diagnostic.message}`);
    }
    failed ||= Diagnostics.errors(report).length > 0;
  }
  process.exitCode = failed ? 1 : 0;
}
