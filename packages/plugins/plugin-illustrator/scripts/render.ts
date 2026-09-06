//
// Copyright 2026 DXOS.org
//

//
// Renders one diagram source to a standalone SVG through the illustrator's layout engines.
//
//   bun scripts/render.ts --format mermaid --input diagram.mmd --output diagram.svg
//   bun scripts/render.ts --format mermaid --output diagram.svg - < diagram.mmd
//   cat diagram.mmd | bun scripts/render.ts                      # SVG on stdout
//
// A `flowchart` goes through the ELK-backed engine, a `classDiagram` through the UML dialect. The
// layout report goes to stderr; the exit code is 1 when the layout has hard defects.
//

import './elk-bun';

import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import * as Diagnostics from '../src/model/diagnostics';
import * as MermaidEngine from '../src/model/mermaid-engine';
import type * as Scene from '../src/model/scene';
import * as Uml from '../src/model/uml';
import { toStandaloneSvg } from './standalone-svg';

const FORMATS = ['mermaid'] as const;
type Format = (typeof FORMATS)[number];

const USAGE = `usage: render.ts [--format mermaid] [--input <file> | -] [--output <file>] [--no-grid]

  --format, -f   source format (default: mermaid; flowchart or classDiagram, detected from the text)
  --input, -i    source file; "-" or omitted reads stdin
  --output, -o   destination file; omitted writes the SVG to stdout
  --no-grid      omit the alignment grid from the export
  --help, -h     show this help`;

const fail = (message: string): never => {
  process.stderr.write(`render: ${message}\n${USAGE}\n`);
  process.exit(2);
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'format': { type: 'string', short: 'f', default: 'mermaid' },
    'input': { type: 'string', short: 'i' },
    'output': { type: 'string', short: 'o' },
    'no-grid': { type: 'boolean', default: false },
    'help': { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  process.stdout.write(`${USAGE}\n`);
  process.exit(0);
}

const isFormat = (value: string): value is Format => (FORMATS as readonly string[]).includes(value);
if (!isFormat(values.format)) {
  fail(`unknown format "${values.format}" (expected one of: ${FORMATS.join(', ')})`);
}

// A lone "-" positional is the conventional spelling for stdin.
const input = values.input ?? positionals[0];
if (positionals.length > 1 || (positionals.length === 1 && positionals[0] !== '-')) {
  fail(`unexpected argument "${positionals.filter((arg) => arg !== '-').join(' ')}"`);
}

const source = readFileSync(input && input !== '-' ? input : 0, 'utf8');
if (!source.trim()) {
  fail('empty source');
}

const compile = async (format: Format, text: string): Promise<readonly Scene.Command[]> => {
  switch (format) {
    case 'mermaid':
      return Uml.isClassDiagram(text) ? Uml.compile(text) : MermaidEngine.compile(text);
  }
};

const commands = await compile(values.format, source);
const objects = commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
const svg = toStandaloneSvg(objects, { grid: values['no-grid'] ? false : undefined });

if (values.output) {
  writeFileSync(values.output, svg);
} else {
  process.stdout.write(svg);
}

const report = Diagnostics.analyze(objects);
const { nodes, connectors, crossings, bends } = report.metrics;
process.stderr.write(`${nodes} nodes, ${connectors} connectors, ${crossings} crossings, ${bends} bends\n`);
for (const diagnostic of report.diagnostics) {
  process.stderr.write(`  ${diagnostic.severity}: ${diagnostic.message}\n`);
}
process.exitCode = Diagnostics.errors(report).length > 0 ? 1 : 0;
