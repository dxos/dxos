//
// Copyright 2026 DXOS.org
//

// Pure renderer for the bench's shared progress file (fixtures/local/results/progress.json, written
// by testing/harness/progress.ts). Shared by the standalone `stats` CLI and by `bench --stats`, so
// both draw the identical per-task bar / rate / ETA table.

import { existsSync, readFileSync } from 'node:fs';

const ICON = { pending: '◦', running: '▶', done: '✔', error: '✗' };
const BAR_WIDTH = 16;

const pad = (text, width) => {
  const string = String(text);
  return string.length >= width ? string.slice(0, width) : string + ' '.repeat(width - string.length);
};

const padLeft = (text, width) => {
  const string = String(text);
  return string.length >= width ? string : ' '.repeat(width - string.length) + string;
};

/** `93s` under a minute, else `1m03s`, else `1h02m`. */
export const duration = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return `${minutes}m${padLeft(seconds, 2).replace(' ', '0')}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h${padLeft(minutes % 60, 2).replace(' ', '0')}m`;
};

const bar = (current, total) => {
  if (!total) {
    return ' '.repeat(BAR_WIDTH);
  }
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((current / total) * BAR_WIDTH)));
  return '█'.repeat(filled) + '·'.repeat(BAR_WIDTH - filled);
};

// Elapsed for an in-flight task: its own `elapsedMs` if the reporter set one, else now − startedAt.
const elapsedOf = (task, nowMs) => {
  if (Number.isFinite(task.elapsedMs)) {
    return task.elapsedMs;
  }
  const started = task.startedAt ? Date.parse(task.startedAt) : NaN;
  return Number.isFinite(started) ? nowMs - started : NaN;
};

const readSnapshot = (file) => {
  if (!existsSync(file)) {
    return { error: `no progress file yet: ${file}` };
  }
  try {
    return { snapshot: JSON.parse(readFileSync(file, 'utf8')) };
  } catch {
    // A concurrent writer may catch us mid-write; the caller reuses the previous frame.
    return { error: 'progress file busy…' };
  }
};

/** Renders the progress file as a printable table. `label` is the path shown in the title. */
export const renderProgress = (file, nowMs, label = file) => {
  const { snapshot, error } = readSnapshot(file);
  if (error) {
    return error;
  }
  const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
  if (tasks.length === 0) {
    return 'no tasks yet.';
  }

  const nameWidth = Math.min(32, Math.max(12, ...tasks.map((task) => task.name.length)));
  const header =
    `${pad('', 2)} ${pad('TASK', nameWidth)}  ${pad('PROGRESS', BAR_WIDTH)} ${pad('', 11)} ` +
    `${pad('RATE', 9)} ${pad('ELAPSED', 8)} ${pad('ETA', 8)}`;

  const lines = tasks.map((task) => {
    const { current = 0, total, status = 'pending', name } = task;
    const icon = ICON[status] ?? '?';
    const elapsedMs = elapsedOf(task, nowMs);
    const rate = Number.isFinite(elapsedMs) && elapsedMs > 0 ? current / (elapsedMs / 1000) : NaN;
    const remaining = total && current < total && rate > 0 ? ((total - current) / rate) * 1000 : NaN;
    const count = total ? `${current}/${total}` : `${current}`;
    const percent = total ? `${Math.round((current / total) * 100)}%` : '';
    const rateText = Number.isFinite(rate) ? `${rate.toFixed(2)}/s` : '—';
    const elapsedText = status === 'pending' ? '—' : duration(elapsedMs);
    const etaText = status === 'running' ? duration(remaining) : status === 'pending' ? '—' : 'done';
    const note = task.note ? `  ${task.note}` : task.error ? `  ⚠ ${task.error}` : '';
    return (
      `${icon}  ${pad(name, nameWidth)}  ${bar(current, total)} ${pad(`${count} ${percent}`, 11)} ` +
      `${pad(rateText, 9)} ${pad(elapsedText, 8)} ${pad(etaText, 8)}${note}`
    );
  });

  const leaves = tasks.filter((task) => Number.isFinite(task.total) && task.name.includes(':'));
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const errorCount = tasks.filter((task) => task.status === 'error').length;
  const curSum = leaves.reduce((sum, task) => sum + (task.current ?? 0), 0);
  const totalSum = leaves.reduce((sum, task) => sum + (task.total ?? 0), 0);
  const summary =
    `${doneCount} done, ${errorCount} error, ${tasks.length} tasks` +
    (totalSum ? ` · ${curSum}/${totalSum} items` : '') +
    ` · updated ${snapshot.updatedAt ?? '—'}`;

  return [`research bench — live stats   (${label})`, '', header, ...lines, '', summary].join('\n');
};

/** True once every task has reached a terminal state (so a watcher can stop). */
export const allTerminal = (file) => {
  const { snapshot } = readSnapshot(file);
  const tasks = snapshot?.tasks ?? [];
  return tasks.length > 0 && tasks.every((task) => task.status === 'done' || task.status === 'error');
};
