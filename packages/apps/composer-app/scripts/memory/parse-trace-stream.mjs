//
// Copyright 2026 DXOS.org
//

/**
 * Streaming memory-infra trace parser for traces too large to JSON.parse whole.
 * Reads .json or .json.gz line-by-line, keeps only metadata + memory-dump
 * events, then prints the per-process allocator ledger (latest dump per pid).
 *
 * Usage: node parse-trace-stream.mjs <trace.json[.gz]>
 */

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';

const file = process.argv[2];
const MB = (bytes) => +(bytes / (1024 * 1024)).toFixed(1);

const input = file.endsWith('.gz') ? createReadStream(file).pipe(createGunzip()) : createReadStream(file);
const rl = createInterface({ input, crlfDelay: Infinity });

const names = new Map();
const threads = new Map();
const dumps = new Map(); // pid -> { ts, allocators }

const parseLine = (line) => {
  let s = line.trim();
  if (s.startsWith('{"traceEvents":[')) {
    s = s.slice('{"traceEvents":['.length);
  }
  if (s.endsWith(',')) {
    s = s.slice(0, -1);
  }
  if (s.endsWith(']}')) {
    s = s.slice(0, -2);
  }
  if (!s.startsWith('{')) {
    return null;
  }
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

for await (const line of rl) {
  if (!line.includes('"ph":"v"') && !line.includes('"ph":"M"')) {
    continue;
  }
  const ev = parseLine(line);
  if (!ev) {
    continue;
  }
  if (ev.ph === 'M') {
    if (ev.name === 'process_name') {
      names.set(ev.pid, ev.args?.name);
    }
    if (ev.name === 'process_labels') {
      names.set(ev.pid, `${names.get(ev.pid) ?? ''} [${String(ev.args?.labels).slice(0, 60)}]`);
    }
    if (ev.name === 'thread_name') {
      if (!threads.has(ev.pid)) {
        threads.set(ev.pid, new Set());
      }
      threads.get(ev.pid).add(ev.args?.name);
    }
  } else if (ev.ph === 'v' && ev.args?.dumps?.allocators) {
    const cur = dumps.get(ev.pid);
    if (!cur || ev.ts > cur.ts) {
      dumps.set(ev.pid, { ts: ev.ts, allocators: ev.args.dumps.allocators });
    }
  }
}

const rows = [];
for (const [pid, { allocators }] of dumps) {
  const top = new Map();
  const detail = [];
  for (const [pathName, node] of Object.entries(allocators)) {
    const size = node.attrs?.effective_size ?? node.attrs?.size;
    if (!size) {
      continue;
    }
    const bytes = parseInt(size.value, 16);
    if (!Number.isFinite(bytes)) {
      continue;
    }
    const parts = pathName.split('/');
    if (parts.length === 1) {
      top.set(parts[0], bytes);
    }
    if (parts.length <= 4 && bytes > 10 * 1024 * 1024) {
      detail.push([pathName, bytes]);
    }
    if (/PerformanceMeasure|PerformanceMark/.test(pathName)) {
      const count = node.attrs?.object_count ? parseInt(node.attrs.object_count.value, 16) : null;
      detail.push([`${pathName} x${count}`, bytes]);
    }
  }
  const attributed = [...top.values()].reduce((a, b) => a + b, 0);
  rows.push({ pid, top, detail, attributed });
}

rows.sort((a, b) => b.attributed - a.attributed);
for (const r of rows.slice(0, 8)) {
  const t = [...(threads.get(r.pid) ?? [])].filter((n) => /Worker|RendererMain/.test(n));
  console.log(`\n== pid ${r.pid} ${names.get(r.pid) ?? '?'}  attributed=${MB(r.attributed)}MB ==`);
  if (t.length) {
    console.log(`   threads: ${t.join(', ').slice(0, 140)}`);
  }
  for (const [name, bytes] of [...r.top.entries()].sort((a, b) => b[1] - a[1])) {
    if (bytes < 1024 * 1024) {
      continue;
    }
    console.log(`  ${name.padEnd(22)} ${String(MB(bytes)).padStart(8)}MB`);
  }
  for (const [name, bytes] of r.detail.sort((a, b) => b[1] - a[1]).slice(0, 14)) {
    console.log(`     ${String(MB(bytes)).padStart(8)}MB  ${name.slice(0, 120)}`);
  }
}
