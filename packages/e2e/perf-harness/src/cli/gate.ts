//
// Copyright 2026 DXOS.org
//

import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { runLogged } from './arms.ts';
import { TARGETS } from './targets.ts';
import { HarnessError, perfDir, workspaceRoot } from './workspace.ts';

type BootReport = {
  count: number;
  bytes: number;
  budget: { count: number; bytes: number };
  entries: Array<{ name: string; bytes: number }>;
};

const isBootReport = (value: unknown): value is BootReport =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'count') === 'number' &&
  typeof Reflect.get(value, 'bytes') === 'number' &&
  Array.isArray(Reflect.get(value, 'entries'));

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

/** The boot-graph budget exactly as CI gates it: exit 0 within budget, 1 over, 4 when it could not be measured. */
export const gate = async ({ target: name }: { target: string }): Promise<number> => {
  const target = TARGETS[name];
  if (!target?.gate) {
    throw new HarnessError(`target "${name}" has no gate`);
  }
  const root = workspaceRoot();
  const logFile = path.join(perfDir(root), 'gate.log');
  mkdirSync(path.dirname(logFile), { recursive: true });
  const started = Date.now();
  const code = await runLogged('moon', ['run', target.gate.moonTarget], { cwd: root, env: process.env, logFile });
  const reportFile = path.join(root, target.appDir, target.gate.report);
  if (!existsSync(reportFile) || (code !== 0 && statSync(reportFile).mtimeMs < started)) {
    throw new HarnessError(`${target.gate.moonTarget} did not measure (exit ${code}); log: ${logFile}`);
  }
  const report: unknown = JSON.parse(readFileSync(reportFile, 'utf8'));
  if (!isBootReport(report)) {
    throw new HarnessError(`unreadable ${reportFile}`);
  }
  const over = report.count > report.budget.count || report.bytes > report.budget.bytes;
  const lines = [
    `boot graph ${over ? 'OVER BUDGET' : 'within budget'}: ${report.count} preload entries (budget ${report.budget.count}), ${mb(report.bytes)} (budget ${mb(report.budget.bytes)})`,
    ...(over
      ? [
          ...[...report.entries]
            .sort((left, right) => right.bytes - left.bytes)
            .slice(0, 8)
            .map(({ name: entry, bytes }) => `  ${mb(bytes).padStart(9)}  ${entry}`),
          'import chains behind the eager graph: DX_TRACE_BOOT_LEAK=1 moon run composer-app:bundle',
        ]
      : []),
  ];
  process.stdout.write(lines.join('\n') + '\n');
  return over ? 1 : 0;
};
