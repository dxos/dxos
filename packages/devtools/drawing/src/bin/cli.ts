//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import * as EffectEx from '@dxos/effect/EffectEx';

import { DEFAULT_APP_URL, diagramName, diagramSource, launch, share } from '../open.ts';
import { type Report, render, source } from '../render.ts';

const USAGE = `Usage: drawing <command> [options] <file>...

Commands:
  render   Lay out each .dx file and write <name>.dx.svg beside it ("-" reads the .dx from stdin; needs -o).
  check    Lay out each .dx file and print the report; write nothing.
  source   Print the .dx source a .dx.svg carries, so the picture can be edited as text again.
  open     Upload a .dx or .dx.svg's source to app.drawing.sh, print the link that opens it there as an
           editable canvas, and open the link in the browser. Anyone with the link can open the diagram;
           the link expires 30 days after it was last opened.

Options:
  -o, --out <path>  Output path (one input only); "-" writes the SVG to stdout. For source, the .dx to write.
      --plain       Write a bare .svg without the embedded source.
      --json        Print the report as JSON.
      --print       For open: print the link only; do not launch the browser (also --no-open).
  -h, --help        Show this help.

Exit code 1 means a source error or a layout defect (overlap, an arrow through a box).
Docs and the diagram language: https://drawing.sh`;

/** Reads a file, or stdin for "-". */
const readInput = (file: string): string => readFileSync(file === '-' ? 0 : file, 'utf8');

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

const formatReport = (file: string, output: string | undefined, report: Report): string => {
  // A source that does not compile has no layout to count.
  const laidOut = report.nodes > 0 || report.connectors > 0;
  return [
    `${file}${output ? ` -> ${output}` : ''}`,
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
const printSources = (files: readonly string[], out: string | undefined): number => {
  if (files.length === 0) {
    console.error('No .dx.svg file given.');
    return 1;
  }
  if (out && out !== '-') {
    if (files.length > 1) {
      console.error('--out takes one input file.');
      return 1;
    }
    const text = source(readFileSync(files[0], 'utf8'));
    if (text === undefined) {
      console.error(`${files[0]}: carries no diagram source (a plain SVG, or exported with --plain).`);
      return 1;
    }
    writeFileSync(out, text.endsWith('\n') ? text : `${text}\n`);
    return 0;
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

/** Shares one diagram and prints its link; the browser opens it unless `print` is set or there is no display. */
const openDiagram = Effect.fn('openDiagram')(
  function* (file: string, { print }: { print: boolean }) {
    const content = readInput(file);
    const text = yield* diagramSource(file, content);
    const appUrl = process.env.DRAWING_APP_URL || DEFAULT_APP_URL;
    const { url } = yield* share(text, { name: diagramName(file, content), appUrl });
    console.log(url);
    console.error('Anyone with this link can open the diagram; it expires 30 days after it was last opened.');
    if (!print && !(yield* launch(url))) {
      console.error('Could not launch a browser; open the link above.');
    }
    return 0;
  },
  Effect.catchTag('OpenError', ({ message }) =>
    Effect.sync(() => {
      console.error(message);
      return 1;
    }),
  ),
);

const main = async (): Promise<number> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'out': { type: 'string', short: 'o' },
      'plain': { type: 'boolean', default: false },
      'json': { type: 'boolean', default: false },
      'print': { type: 'boolean', default: false },
      'no-open': { type: 'boolean', default: false },
      'help': { type: 'boolean', short: 'h', default: false },
    },
  });
  const [command, ...files] = positionals;
  if (values.help || !command) {
    console.log(USAGE);
    return values.help ? 0 : 1;
  }
  if (command === 'source') {
    return printSources(files, values.out);
  }
  if (command === 'open') {
    if (files.length !== 1) {
      console.error('open takes one .dx or .dx.svg file.');
      return 1;
    }
    return EffectEx.runPromise(openDiagram(files[0], { print: values.print || values['no-open'] }));
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
  if (command === 'render' && files.includes('-') && !values.out) {
    console.error('Rendering from stdin needs -o <path>.');
    return 1;
  }

  let failed = false;
  const reports = [];
  const written: string[] = [];
  for (const file of files) {
    // From stdin the output path names the drawing.
    const name =
      file === '-'
        ? path.basename(values.out && values.out !== '-' ? values.out : 'diagram').replace(/(\.dx)?(\.svg)?$/, '')
        : path.basename(file).replace(/\.dx$/, '');
    const { svg, report } = await render(readInput(file), { name, plain: values.plain });
    failed ||= report.failed;
    let output: string | undefined;
    if (command === 'render' && svg) {
      output = values.out ?? path.join(path.dirname(file), `${name}${values.plain ? '.svg' : '.dx.svg'}`);
      if (output === '-') {
        process.stdout.write(svg);
      } else {
        writeFileSync(output, svg);
        written.push(output);
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
  // Sharing uploads the source, so render only says how; the link is made on an explicit `open`.
  if (!values.json && !values.plain) {
    for (const output of written) {
      console.log(`Open in app.drawing.sh: drawing open ${output}`);
    }
  }
  return failed ? 1 : 0;
};

process.exitCode = await main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  return 1;
});
