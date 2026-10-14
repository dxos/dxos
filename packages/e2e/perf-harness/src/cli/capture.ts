//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { attachAll, detachAll } from '../cdp.ts';
import { startProfiling } from '../collectors/profiler.ts';
import { ARMS_FILE, type ArmsRecord, CAPTURE_STAGE, summarize } from './summarize.ts';
import { TARGETS } from './targets.ts';
import { HarnessError, perfDir, workspaceRoot } from './workspace.ts';

export type CaptureOptions = {
  target: string;
  /** A browser's remote debugging port: dev, preview, or an Electron profile started with one. */
  attach: number;
  seconds: number;
  /** The bundle the page was served from, for source maps; a dev server needs none. */
  dist?: string;
  top: number;
};

/**
 * Profiles every realm of an app someone is already running, for `seconds`, and prints the same
 * digest `summarize` gives a measured run. The capture is the field evidence a scenario must match.
 */
export const capture = async ({ target: name, attach, seconds, dist, top }: CaptureOptions): Promise<number> => {
  const target = TARGETS[name];
  if (!target) {
    throw new HarnessError(`unknown target "${name}"; known: ${Object.keys(TARGETS).join(', ')}`);
  }
  const root = workspaceRoot();
  const id = `capture-${new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)}`;
  const dir = path.join(perfDir(root), 'runs', id);
  const artifacts = path.join(dir, 'results', 'artifacts', id);
  mkdirSync(artifacts, { recursive: true });

  const targets = await attachAll(attach).catch((error: unknown) => {
    throw new HarnessError(
      `nothing to attach to on port ${attach}: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
  if (targets.length === 0) {
    throw new HarnessError(`no page or worker on port ${attach}`);
  }
  try {
    const profiler = startProfiling(artifacts);
    await profiler.beginStage(CAPTURE_STAGE, targets);
    process.stderr.write(`profiling ${targets.map(({ name: realm }) => realm).join(', ')} for ${seconds}s\n`);
    await sleep(seconds * 1000);
    const { files } = await profiler.endStage();
    process.stderr.write(`wrote ${files.length} profiles under ${path.relative(root, artifacts)}\n`);
  } finally {
    detachAll(targets);
  }

  writeFileSync(
    path.join(dir, ARMS_FILE),
    JSON.stringify({
      target: target.name,
      candidate: dist ? path.resolve(dist) : path.join(root, target.appDir, target.build.outDir),
    } satisfies ArmsRecord),
  );
  return summarize({ run: id, top, heap: false });
};
