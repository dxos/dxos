#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Builds the narration cues from the scripts in `docs/ECHO.md`: each numbered `**Title** (at Ns)` item of a script
 * section is one cue, and each of its bullets one line read. Writes `docs/cues/<name>.json` and, when the voice
 * prompter's folder exists, its `cues.json`.
 *
 *   node tools/autocue/showcase/cues.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DOCS = fileURLToPath(new URL('docs/', import.meta.url));
const PROMPTER = fileURLToPath(new URL('../../../temp/voice/', import.meta.url));

/**
 * Each script: its section heading, how far its video's timeline is shifted from the script's (ECHO.m4v opens 3s later
 * than its source render), and `end`, where the last section's picture ends before the end card. `at` places the
 * sections on a cut whose timing differs from the script's own.
 */
const SCRIPTS = [
  { name: 'echo', doc: 'ECHO.md', heading: '## Script', offset: 3, end: 60 },
  // showcase-full.mp4: documents from 4s, projects from 46s, inbox from 70s, the plugin grid from 110s, end card at 123s.
  {
    name: 'composer',
    doc: 'ECHO.md',
    heading: '### Script (draft)',
    offset: 0,
    at: [4.5, 46.5, 70.5, 110.5],
    end: 123,
  },
];

const parse = (markdown, heading) => {
  const from = markdown.indexOf(`${heading}\n`);
  if (from < 0) {
    return [];
  }
  // The section runs to the next heading of any level.
  const rest = markdown.slice(from + heading.length);
  const script = rest.slice(0, rest.search(/\n#{1,6} /) >= 0 ? rest.search(/\n#{1,6} /) : undefined);
  // A bullet may wrap onto indented continuation lines, which join its first line.
  return [
    ...script.matchAll(/^\d+\. \*\*([^*]+)\*\*(?: \(at ([\d.]+)s[^)]*\))? *\n\n?((?: {3}- .*\n?(?: {5}\S.*\n?)*)+)/gm),
  ].map(([, title, at, body]) => {
    const lines = [...body.matchAll(/^ {3}- (.*(?:\n {5}\S.*)*)/gm)].map(([, line]) =>
      line.replace(/\s+/g, ' ').trim(),
    );
    return { at: at === undefined ? undefined : Number(at), title, lines, text: lines.join(' ') };
  });
};

const PROMPTER_CUES = `${PROMPTER}cues.json`;
// Videos with no script doc keep the cues the prompter already has.
const prompter = existsSync(PROMPTER_CUES) ? JSON.parse(readFileSync(PROMPTER_CUES, 'utf8')) : {};
for (const { name, doc, heading, offset, at, end } of SCRIPTS) {
  const cues = parse(readFileSync(DOCS + doc, 'utf8'), heading).map((cue, index) => ({
    ...cue,
    at: at?.[index] ?? cue.at,
  }));
  if (cues.some((cue) => cue.at === undefined)) {
    throw new Error(
      `${doc}: every item under ${heading} needs "(at Ns)" unless the script places its sections with \`at\``,
    );
  }
  if (cues.length === 0) {
    throw new Error(`${doc} has no "N. **Title** (at Ns)" items under ${heading}`);
  }
  writeFileSync(`${DOCS}cues/${name}.json`, `${JSON.stringify(cues, null, 2)}\n`);
  prompter[name] = cues.map((cue, index) => ({
    ...cue,
    at: cue.at + offset,
    ...(index === cues.length - 1 && end ? { end } : {}),
  }));
  console.log(
    `${name}: ${cues.length} cues, ${cues.reduce((words, cue) => words + cue.text.split(/\s+/).length, 0)} words`,
  );
}
if (existsSync(PROMPTER)) {
  writeFileSync(PROMPTER_CUES, `${JSON.stringify(prompter, null, 1)}\n`);
  console.log('prompter cues updated');
}
