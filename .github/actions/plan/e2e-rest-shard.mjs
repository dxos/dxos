#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

// Picks one `e2e rest` cell's targets from `moon query tasks "task=e2e"` on stdin, balanced by measured
// duration rather than count: `react-ui-canvas` alone runs about five minutes, and a count split put it
// with `react-ui-mosaic` on the same cell, which ran 10.6 minutes on Firefox against 5.9 for its sibling.
// moon ignores MQL negation in `moon query tasks` and `moon exec --query`, so composer-e2e, which has
// its own job, is filtered here.
//
// Usage: moon query tasks "task=e2e" | node e2e-rest-shard.mjs <shard> <total>
// Prints the cell's targets space-separated; exits 1 when the pool comes back empty.

import { pathToFileURL } from 'node:url';

// Seconds per target on Chromium (Check run 39931267278 and nightly 39899427635). Firefox and WebKit run
// slower but in the same proportions, which is all the split needs. Update when a target's suite grows.
const WEIGHTS = {
  'react-ui-canvas': 300,
  'react-ui-mosaic': 145,
  'todomvc': 120,
  'plugin-kanban': 110,
  'react-ui-table': 100,
  'plugin-sheet': 95,
  'react-ui-canvas-compute': 85,
  'lit-grid': 25,
  'rpc-tunnel-e2e': 25,
  'plugin-script': 20,
};

// A target missing from the table counts as a typical one until it is measured.
const DEFAULT_WEIGHT = 100;

/**
 * Splits projects into `total` cells by longest-processing-time-first: heaviest first, each onto the
 * lightest cell so far. Ties break by name, so every cell computes the same partition.
 */
export const balance = (projects, total, weights = WEIGHTS) => {
  const weight = (project) => weights[project] ?? DEFAULT_WEIGHT;
  const cells = Array.from({ length: total }, () => ({ load: 0, projects: [] }));
  const ordered = [...projects].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b));
  for (const project of ordered) {
    const lightest = cells.reduce((min, cell) => (cell.load < min.load ? cell : min));
    lightest.load += weight(project);
    lightest.projects.push(project);
  }
  return cells.map(({ projects }) => projects.sort());
};

const main = () => {
  const [shard, total] = process.argv.slice(2).map(Number);
  if (!Number.isInteger(shard) || !Number.isInteger(total) || shard < 0 || shard >= total) {
    console.error('usage: e2e-rest-shard.mjs <shard> <total>');
    process.exit(2);
  }
  let input = '';
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => {
    const projects = Object.keys(JSON.parse(input).tasks).filter((project) => project !== 'composer-e2e');
    if (projects.length === 0) {
      console.error('no e2e targets resolved');
      process.exit(1);
    }
    const cell = balance(projects, total)[shard];
    console.log(cell.map((project) => `${project}:e2e`).join(' '));
  });
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
