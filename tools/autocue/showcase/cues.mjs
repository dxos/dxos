#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Builds the narration cues from the script in `docs/ECHO.md`: each numbered `**Title** (at Ns)` item of a doc's `## Script`
 * section is one cue, and each of its bullets one line read. Writes `docs/cues/<name>.json` and, when the voice
 * prompter's folder exists, its `cues.json`.
 *
 *   node tools/autocue/showcase/cues.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DOCS = fileURLToPath(new URL('docs/', import.meta.url));
const PROMPTER = fileURLToPath(new URL('../../../temp/voice/', import.meta.url));

/** Each doc, and how far its video's timeline is shifted from the script's: ECHO.m4v opens 3s later than its source render. */
const SCRIPTS = [{ name: 'echo', doc: 'ECHO.md', offset: 3 }];

const parse = (markdown) => {
  const script = markdown.slice(markdown.indexOf('## Script'));
  return [...script.matchAll(/^\d+\. \*\*([^*]+)\*\* \(at ([\d.]+)s\)\n\n?((?: {3}- .*\n?)+)/gm)].map(
    ([, title, at, body]) => {
      const lines = [...body.matchAll(/^ {3}- (.*)$/gm)].map(([, line]) => line.trim());
      return { at: Number(at), title, lines, text: lines.join(' ') };
    },
  );
};

const PROMPTER_CUES = `${PROMPTER}cues.json`;
// Videos with no script doc keep the cues the prompter already has.
const prompter = existsSync(PROMPTER_CUES) ? JSON.parse(readFileSync(PROMPTER_CUES, 'utf8')) : {};
for (const { name, doc, offset } of SCRIPTS) {
  const cues = parse(readFileSync(DOCS + doc, 'utf8'));
  if (cues.length === 0) {
    throw new Error(`${doc} has no "N. **Title** (at Ns)" items under ## Script`);
  }
  writeFileSync(`${DOCS}cues/${name}.json`, `${JSON.stringify(cues, null, 2)}\n`);
  prompter[name] = cues.map((cue) => ({ ...cue, at: cue.at + offset }));
  console.log(
    `${name}: ${cues.length} cues, ${cues.reduce((words, cue) => words + cue.text.split(/\s+/).length, 0)} words`,
  );
}
if (existsSync(PROMPTER)) {
  writeFileSync(PROMPTER_CUES, `${JSON.stringify(prompter, null, 1)}\n`);
  console.log('prompter cues updated');
}
