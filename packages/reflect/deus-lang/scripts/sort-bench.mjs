//
// Copyright 2026 DXOS.org
//

// The sorting case study (D83, D91, docs/IMMUTABILITY.md): times examples/sorting.deus on the
// TypeScript kernel, the Rust kernel and compiled wasm, against JavaScript baselines.
//
//   node scripts/sort-bench.mjs [--sizes 10000,100000] [--wasm-sizes 10000,100000,1000000]
//
// It needs a codebase with the example added (DEUS_CODEBASE) and target/release/deus-kernel built.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const kernel = join(root, '../deus-kernel/target/release/deus-kernel');
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return (index >= 0 ? process.argv[index + 1] : fallback).split(',').map(Number);
};
const sizes = arg('--sizes', '10000,100000');
const wasmSizes = arg('--wasm-sizes', '10000,100000,1000000');
const runs = 3;
const benches = ['Merge', 'Quick', 'Heap', 'Array', 'Prelude', 'Map'];
const compiled = ['Merge', 'Quick', 'Heap', 'Array'];

const best = (fn) => {
  let min = Infinity;
  let value;
  for (let i = 0; i < runs; i++) {
    const start = process.hrtime.bigint();
    value = fn();
    min = Math.min(min, Number(process.hrtime.bigint() - start) / 1e6);
  }
  return { ms: min, value };
};

const rows = [];
const report = (backend, sort, n, ms, extra = '') => {
  rows.push({ backend, sort, n, ms: Math.round(ms * 10) / 10, extra });
  console.log(
    `${backend.padEnd(10)} ${sort.padEnd(14)} ${String(n).padStart(8)} ${ms.toFixed(1).padStart(10)} ms  ${extra}`,
  );
};

// Interpreters: whole-process time minus the time to start and generate the same input.
const interpreters = [
  [
    'ts-kernel',
    (expr) => execFileSync(process.execPath, [join(root, 'bin/deus.mjs'), 'eval', expr], { encoding: 'utf8' }),
  ],
  ['rs-kernel', (expr) => execFileSync(kernel, ['eval', expr], { encoding: 'utf8' })],
];
for (const [backend, run] of interpreters) {
  for (const n of sizes) {
    const base = best(() => run(`Sorting.benchInput ${n} 1`)).ms;
    for (const sort of benches) {
      if (sort === 'Map' && n > 100000) {
        continue;
      }
      const { ms, value } = best(() => run(`Sorting.bench${sort} ${n} 1`));
      if (Number(value) !== n) {
        throw new Error(`${backend} bench${sort} ${n}: ${value}`);
      }
      report(backend, sort, n, ms - base);
    }
  }
}

// Steps: the machine-independent cost, the same on both kernels.
for (const sort of benches) {
  const steps = interpreters[0][1](
    `Code.cost (fun _ => Sorting.bench${sort} 10000 1) - Code.cost (fun _ => Sorting.benchInput 10000 1)`,
  );
  report('steps', sort, 10000, 0, `${steps.trim()} steps`);
}

// Wasm: each run instantiates a fresh module, since the heap never frees; `alloc(0)` after the run is the
// heap pointer, so it measures every byte the program allocated.
const dir = mkdtempSync(join(tmpdir(), 'deus-sort-'));
const modules = {};
for (const sort of ['Input', ...compiled]) {
  const file = join(dir, `${sort}.wasm`);
  execFileSync(process.execPath, [join(root, 'bin/deus.mjs'), 'build', `Sorting.bench${sort}`, '-o', file, '--wasm']);
  modules[sort] = new WebAssembly.Module(readFileSync(file));
}
const wasmRun = (sort, n) => {
  let bytes = 0;
  const { ms, value } = best(() => {
    const { exports } = new WebAssembly.Instance(modules[sort]);
    const result = exports[`bench${sort}`](n, 1);
    bytes = exports.alloc(0);
    return result;
  });
  return { ms, value, bytes };
};
for (const n of wasmSizes) {
  const base = wasmRun('Input', n);
  for (const sort of compiled) {
    const { ms, value, bytes } = wasmRun(sort, n);
    if (value !== n) {
      throw new Error(`wasm bench${sort} ${n}: ${value}`);
    }
    report('wasm', sort, n, ms - base.ms, `${((bytes - base.bytes) / 2 ** 20).toFixed(1)} MiB allocated`);
  }
}

// JavaScript, the same algorithms: immutable cons lists, then a typed array in place.
const next = (s) => ((Math.imul(s, 1103515245) + 12345) | 0) & 0x7fffffff;
const randomList = (n, seed) => {
  let s = next(seed);
  let list = null;
  for (let k = 0; k < n; k++) {
    list = { h: s >>> 8, t: list };
    s = next(s);
  }
  return list;
};
const toArray = (list) => {
  const out = [];
  for (let l = list; l; l = l.t) {
    out.push(l.h);
  }
  return out;
};
const sorted = (xs) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);
const consMerge = (list) => {
  const rev = (xs, acc) => {
    for (let l = xs; l; l = l.t) {
      acc = { h: l.h, t: acc };
    }
    return acc;
  };
  const merge = (xs, ys) => {
    let acc = null;
    while (xs && ys) {
      if (xs.h <= ys.h) {
        acc = { h: xs.h, t: acc };
        xs = xs.t;
      } else {
        acc = { h: ys.h, t: acc };
        ys = ys.t;
      }
    }
    return rev(acc, xs ?? ys);
  };
  let runs = null;
  for (let l = list; l; l = l.t) {
    runs = { h: { h: l.h, t: null }, t: runs };
  }
  while (runs && runs.t) {
    let acc = null;
    while (runs && runs.t) {
      acc = { h: merge(runs.h, runs.t.h), t: acc };
      runs = runs.t.t;
    }
    runs = runs ? { h: runs.h, t: acc } : acc;
  }
  return runs ? runs.h : null;
};
const consQuick = (xs, rest) => {
  if (!xs) {
    return rest;
  }
  const p = xs.h;
  let lo = null;
  let hi = null;
  for (let l = xs.t; l; l = l.t) {
    if (l.h < p) {
      lo = { h: l.h, t: lo };
    } else {
      hi = { h: l.h, t: hi };
    }
  }
  return consQuick(lo, { h: p, t: consQuick(hi, rest) });
};
const quickInPlace = (a, lo, hi) => {
  while (hi - lo > 1) {
    const mid = lo + ((hi - lo) >> 1);
    let t = a[mid];
    a[mid] = a[hi - 1];
    a[hi - 1] = t;
    const pivot = a[hi - 1];
    let i = lo;
    for (let j = lo; j < hi - 1; j++) {
      if (a[j] < pivot) {
        t = a[i];
        a[i] = a[j];
        a[j] = t;
        i++;
      }
    }
    t = a[i];
    a[i] = a[hi - 1];
    a[hi - 1] = t;
    quickInPlace(a, lo, i);
    lo = i + 1;
  }
};
for (const n of wasmSizes) {
  const list = randomList(n, 1);
  const cases = [
    ['cons merge', () => toArray(consMerge(list))],
    ['cons quick', () => toArray(consQuick(list, null))],
    [
      'Int32 quick',
      () => {
        const a = Int32Array.from(toArray(list));
        quickInPlace(a, 0, n);
        return Array.from(a);
      },
    ],
    ['Int32 .sort', () => Array.from(Int32Array.from(toArray(list)).sort())],
  ];
  for (const [sort, fn] of cases) {
    const { ms, value } = best(fn);
    if (value.length !== n || !sorted(value)) {
      throw new Error(`js ${sort} ${n}`);
    }
    report('js', sort, n, ms);
  }
}

console.log(JSON.stringify(rows));
