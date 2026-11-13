//
// Copyright 2026 DXOS.org
//

// Rewrites a space archive with every user-content string and number replaced, for use as a shared test fixture;
// the rules are documented in src/internal/space-export/space-archive-anonymizer.ts.
//
//   node scripts/anonymize-space-archive.ts <in.tar> <out.tar> [--seed 1] [--map map.json] [--no-scan]
//
// After writing, it decodes the output and scans it for secret-like patterns and for any replaced original run of
// seven or more characters; it exits non-zero when a high-confidence secret pattern or such a residue is found.
// `--map` writes the reverse-engineerable run map and is for debugging only: never share it with the archive.

import * as Automerge from '@automerge/automerge';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

import {
  Anonymizer,
  type ArchiveFile,
  anonymizeSpaceArchiveFiles,
  scanForSecrets,
} from '../src/internal/space-export/space-archive-anonymizer.ts';

// The package ships CommonJS without named-export hints, so Node's ESM loader only exposes a default export.
const { Archive }: typeof import('@obsidize/tar-browserify') = createRequire(import.meta.url)(
  '@obsidize/tar-browserify',
);

const HIGH_CONFIDENCE = new Set([
  'anthropicKey',
  'openaiKey',
  'githubToken',
  'slackToken',
  'awsAccessKey',
  'googleApiKey',
  'jwt',
  'privateKey',
  'bearer',
]);

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'seed': { type: 'string', default: '1' },
    'map': { type: 'string' },
    'no-scan': { type: 'boolean', default: false },
  },
});

const [inputPath, outputPath] = positionals;
if (!inputPath || !outputPath) {
  console.error('usage: anonymize-space-archive.ts <in.tar> <out.tar> [--seed N] [--map map.json] [--no-scan]');
  process.exit(2);
}

const seed = Number(values.seed);
if (!Number.isSafeInteger(seed)) {
  console.error(`invalid --seed: ${values.seed}`);
  process.exit(2);
}

const readArchive = async (path: string): Promise<ArchiveFile[]> => {
  const { entries } = await Archive.extract(new Uint8Array(readFileSync(path)));
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => ({ path: entry.fileName, content: entry.content ?? new Uint8Array() }));
};

/** Every key and string an output file holds once decoded, so the scan sees Automerge and base64 payloads as text. */
const decodedStrings = (file: ArchiveFile): string[] => {
  const strings: string[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      strings.push(value);
    } else if (value instanceof Automerge.ImmutableString) {
      strings.push(value.val);
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === 'object' && value !== null && !(value instanceof Uint8Array)) {
      for (const [key, item] of Object.entries(value)) {
        strings.push(key);
        visit(item);
      }
    }
  };
  const text = new TextDecoder().decode(file.content);
  if (file.path.endsWith('.bin')) {
    if (file.content.byteLength > 0) {
      visit(Automerge.load(file.content));
    }
  } else if (file.path.split('/').at(-1)?.startsWith('blocks-')) {
    const blocks: { data: string }[] = JSON.parse(text);
    visit(blocks.map((block) => JSON.parse(Buffer.from(block.data, 'base64').toString('utf8'))));
  } else {
    visit(JSON.parse(text));
  }
  return strings;
};

const anonymizer = new Anonymizer({ seed });
const input = await readArchive(inputPath);
const output = anonymizeSpaceArchiveFiles(anonymizer, input);

const archive = new Archive();
for (const file of output) {
  archive.addBinaryFile(file.path, file.content);
}
writeFileSync(outputPath, archive.toUint8Array());
console.log(`wrote ${outputPath}: ${output.length} files (input ${input.length})`);

if (values.map) {
  writeFileSync(values.map, JSON.stringify(anonymizer.mapping(), null, 2));
  console.log(`wrote run map to ${values.map} (debug only, reverses the anonymization)`);
}

if (!values['no-scan']) {
  const written = await readArchive(outputPath);
  const replaced = anonymizer.replacedTokens();
  const findings = new Map<string, number>();
  const residue = new Map<string, number>();
  for (const file of written) {
    // Raw bytes too, since Automerge stores strings uncompressed and a decode could hide a stray chunk.
    for (const text of [...decodedStrings(file), Buffer.from(file.content).toString('latin1')]) {
      for (const finding of scanForSecrets(text)) {
        findings.set(finding.pattern, (findings.get(finding.pattern) ?? 0) + 1);
      }
      for (const [token] of text.matchAll(/[\p{L}\p{N}]+/gu)) {
        if (replaced.has(token)) {
          residue.set(token, (residue.get(token) ?? 0) + 1);
        }
      }
    }
  }

  console.log('secret-like patterns (decoded + raw):', Object.fromEntries(findings));
  console.log(`replaced original runs (>= 7 chars) still present: ${residue.size} distinct`);
  const blocking = [...findings.keys()].filter((pattern) => HIGH_CONFIDENCE.has(pattern));
  if (blocking.length > 0 || residue.size > 0) {
    console.error(`scan failed: ${[...blocking, ...(residue.size > 0 ? ['residue'] : [])].join(', ')}`);
    process.exit(1);
  }
}
