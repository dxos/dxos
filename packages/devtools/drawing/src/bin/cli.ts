//
// Copyright 2026 DXOS.org
//

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { type Report, render, source } from '../render.ts';

const USAGE = `Usage: drawing <command> [options] <file.dx>...

Commands:
  render   Lay out each .dx file and write <name>.dx.svg beside it.
  check    Lay out each .dx file and print the report; write nothing.
  source   Print the .dx source a .dx.svg carries, so the picture can be edited as text again.

Options:
  -o, --out <path>  Output path (one input only); "-" writes the SVG to stdout.
      --plain       Write a bare .svg without the embedded source.
      --json        Print the report as JSON.
  -h, --help        Show this help.

Exit code 1 means a source error or a layout defect (overlap, an arrow through a box).
Docs and the diagram language: https://drawing.sh`;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

const formatReport = (file: string, output: string | undefined, report: Report): string => {
  // A source that does not compile has no layout to count.
  const laidOut = report.nodes > 0 || report.connectors > 0;
  return [
    `${file}${output ? ` → ${output}` : ''}`,
    ...(laidOut
      ? [
          `  ${plural(report.nodes, 'node')}, ${plural(report.connectors, 'connector')}, ` +
            `${plural(report.crossings, 'crossing')}, ${plural(report.bends, 'bend')}`,
        ]
      : []),
    ...report.notes.map(({ severity, message }) => `  ${severity}: ${message}`),
  ].join('\n');
};

/** Prints each file's embedded source; a file that carries none is an error, since the caller expected one. */
const printSources = (files: readonly string[]): number => {
  if (files.length === 0) {
    console.error('No .dx.svg file given.');
    return 1;
  }
  let missing = false;
  for (const file of files) {
    const text = source(readFileSync(file, 'utf8'));
    if (text === undefined) {
      console.error(`${file}: carries no diagram source (a plain SVG, or exported with --plain).`);
      missing = true;
      continue;
    }
    if (files.length > 1) {
      console.log(`# ${file}`);
    }
    process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
  }
  return missing ? 1 : 0;
};

const main = async (): Promise<number> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string', short: 'o' },
      plain: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  const [command, ...files] = positionals;
  if (values.help || !command) {
    console.log(USAGE);
    return values.help ? 0 : 1;
  }
  if (command === 'source') {
    return printSources(files);
  }
  if (command !== 'render' && command !== 'check') {
    console.error(`Unknown command: ${command}\n\n${USAGE}`);
    return 1;
  }
  if (files.length === 0) {
    console.error('No .dx file given.');
    return 1;
  }
  if (values.out && files.length > 1) {
    console.error('--out takes one input file.');
    return 1;
  }

  let failed = false;
  const reports = [];
  for (const file of files) {
    const name = path.basename(file).replace(/\.dx$/, '');
    const { svg, report } = await render(readFileSync(file, 'utf8'), { name, plain: values.plain });
    failed ||= report.failed;
    let output: string | undefined;
    if (command === 'render' && svg) {
      output = values.out ?? path.join(path.dirname(file), `${name}${values.plain ? '.svg' : '.dx.svg'}`);
      if (output === '-') {
        process.stdout.write(svg);
      } else {
        writeFileSync(output, svg);
      }
    }
    reports.push({ file, output, ...report });
    // With the SVG on stdout the report goes to stderr, so the two never mix.
    if (!values.json) {
      (output === '-' ? console.error : console.log)(formatReport(file, output === '-' ? undefined : output, report));
    }
  }
  if (values.json) {
    // As with the text report: with the SVG on stdout, the JSON goes to stderr.
    (values.out === '-' ? console.error : console.log)(
      JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2),
    );
  }
  return failed ? 1 : 0;
};

process.exitCode = await main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  return 1;
});
