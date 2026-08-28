#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Enumerates `flow` blocks across the repo's `.mdl` specs.
// Usage: node list-flows.mjs [filter] [--json]
//   filter  substring matched against the document path or the flow id/title.
//
// Deliberately regex-based rather than a real parser: the block grammar is still settling, and a
// listing that breaks on an unparsed field is worse than one that reports what it found.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SKIP = new Set(['node_modules', 'dist', '.git', '.moon', 'out', 'temp', '.cache']);

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) {
      continue;
    }
    const path = join(dir, entry);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue; // Broken symlink.
    }
    if (stat.isDirectory()) {
      walk(path, out);
    } else if (entry.endsWith('.mdl')) {
      out.push(path);
    }
  }
  return out;
};

/** Steps per stage. A stage header sits at two spaces; its steps are `- name:`/`- do:` at four. */
const countStages = (body) => {
  const counts = { before: 0, test: 0, after: 0 };
  let stage;
  for (const line of body.split('\n')) {
    const header = line.match(/^ {2}(\w+):\s*$/);
    if (header) {
      stage = header[1] in counts ? header[1] : undefined;
      continue;
    }
    if (stage && /^ {4}- +(?:name|do):/.test(line)) {
      counts[stage]++;
    }
  }
  return counts;
};

/** Flows in one document, with the fields a caller needs to decide what to run. */
const parseFlows = (text, file) => {
  const flows = [];
  // Block bodies are fenced; the header is the fence's first line.
  const blockRe = /```mdl\n(flow\s+[^\n]*\n[\s\S]*?)```/g;
  let match;
  while ((match = blockRe.exec(text)) !== null) {
    const body = match[1];
    const header = body.match(/^flow\s+([\w.-]+)\s*(?::\s*(.*))?$/m);
    if (!header) {
      continue;
    }
    flows.push({
      file,
      id: header[1],
      title: (header[2] ?? '').trim(),
      status: body.match(/^\s*status:\s*(\w+)/m)?.[1] ?? 'unverified',
      actors: body.match(/^\s*actors:\s*([\w|\s]+?)\s*$/m)?.[1]?.trim() ?? 'both',
      // Per stage, so a partial run's size is visible; `steps` is the test, the other two are fixture.
      // Line-walked rather than matched: a lazy regex with an `m`-flag `$` in its lookahead stops
      // at the first line break, which silently reported one step per stage.
      stages: countStages(body),
      covers: body.match(/^\s*covers:\s*\[(.*?)\]/m)?.[1] ?? '',
    });
  }
  return flows;
};

const root = process.env.DX_REPO_ROOT ?? process.cwd();
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const positional = args.filter((arg) => !arg.startsWith('--'));

// Two positionals resolve exactly — `<plugin> <flowId>`. One is the loose substring filter, and a
// flow id alone is genuinely ambiguous: QA-1 exists in more than one plugin.
const [plugin, flowId] = positional.length >= 2 ? positional : [undefined, undefined];
const filter = positional.length >= 2 ? undefined : positional[0];

// A dialect definition (`org.dxos.spec.*`) carries example flows to document its own syntax; those
// are illustrations, not plans, and listing them as runnable is a trap.
const isDialect = (text) => /^id:\s*org\.dxos\.spec\./m.test(text.split('---')[1] ?? '');

const flows = walk(root)
  .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
  .filter(({ text }) => !isDialect(text))
  .flatMap(({ file, text }) => parseFlows(text, relative(root, file)))
  .filter((flow) => !filter || `${flow.file} ${flow.id} ${flow.title}`.toLowerCase().includes(filter.toLowerCase()))
  .filter(
    (flow) =>
      !plugin || flow.file.includes(`plugin-${plugin.replace(/^plugin-/, '')}/`) || flow.file.includes(`/${plugin}/`),
  )
  .filter((flow) => !flowId || flow.id.toLowerCase() === flowId.toLowerCase());

if (asJson) {
  console.log(JSON.stringify(flows, null, 2));
} else if (flows.length === 0) {
  const what = plugin ? `${plugin} ${flowId}` : filter;
  console.log(what ? `No flows matching "${what}".` : 'No flows found.');
} else {
  const width = (key) => Math.max(...flows.map((flow) => String(flow[key]).length));
  const [idWidth, statusWidth] = [width('id'), width('status')];
  flows.forEach((flow, index) => {
    const num = String(index + 1).padStart(2);
    const { before = 0, test = 0, after = 0 } = flow.stages ?? {};
    console.log(
      `${num}. ${flow.id.padEnd(idWidth)}  ${flow.status.padEnd(statusWidth)}  ${String(test).padStart(2)} test` +
        ` (${before} before, ${after} after)  ${flow.title}`,
    );
    console.log(`    ${flow.file}${flow.covers ? `  covers: ${flow.covers}` : ''}`);
  });
}
