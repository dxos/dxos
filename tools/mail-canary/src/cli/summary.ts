#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Renders a nightly report as Markdown for the GitHub job summary.
//
//   node src/cli/summary.ts <report.json> >> "$GITHUB_STEP_SUMMARY"

import { readFileSync } from 'node:fs';

import { type NightlyReport, renderSummary } from '../nightly/index.ts';

const [path] = process.argv.slice(2);
if (!path) {
  console.error('usage: node src/cli/summary.ts <report.json>');
  process.exit(1);
}

const report: NightlyReport = JSON.parse(readFileSync(path, 'utf8'));
process.stdout.write(renderSummary(report));
