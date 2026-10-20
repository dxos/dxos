//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';
import { keptCliTest } from './kept-verdict.ts';

const { root, scratch, file, deus } = cliHarness('cli-replicate-');

const kept = keptCliTest(import.meta.filename);

// Replication through bundles and remotes, in a file of their own so they run in parallel with the rest.
describe('deus CLI replication', () => {
  test(
    'replicates through immutable bundles and surfaces concurrent heads',
    { timeout: 240_000 },
    kept(({ expect }) => {
      const remote = join(scratch, 'remote');
      const a = ['--codebase', join(scratch, 'replica-a')];
      const b = ['--codebase', join(scratch, 'replica-b')];
      for (const c of [a, b]) {
        deus('init', '--empty', ...c);
        deus('remote', 'add', 'origin', remote, ...c);
      }
      // Fixed messages keep causal hashes, and so the strata boundaries, the same on every run.
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), '--message', 'prelude', ...a);
      expect(deus('push', ...a).stdout).toMatch(/^Pushed main to origin as 0-[0-9a-f]{64}\.\n$/);
      expect(deus('push', ...a).stdout).toBe('origin already has main.\n');
      // Only the shared toolchain remote refreshes the public explorer; a toolchain store pushing elsewhere does not.
      const toolchain = ['--codebase', join(scratch, 'replica-toolchain')];
      deus('init', '--empty', ...toolchain);
      deus('project', 'init', 'https://dxos.org/deus/toolchain', ...toolchain);
      deus('remote', 'add', 'origin', join(scratch, 'remote-toolchain'), ...toolchain);
      deus('add', file('t.deus', 'def t : Int := 1\n'), ...toolchain);
      expect(deus('push', ...toolchain)).toMatchObject({
        stdout: expect.stringMatching(/^Pushed main to origin as 0-[0-9a-f]{64}\.\n$/),
        code: 0,
      });
      deus('pull', ...b);
      expect(deus('merge', 'origin.main', ...b).stdout).toMatch(/^Fast-forwarded/);
      // Builtin objects travel with the bundle, so the clone types constructor patterns.
      expect(existsSync(join(scratch, 'replica-b', 'objects', '#O', '#Option'))).toBe(true);
      expect(deus('eval', 'match List.head? [41] with | some g => g + 1 | none => 0', ...b).stdout).toBe('42\n');

      // A pull ignores files that are not bundles and skips a bundle whose text does not hash to its name (D91).
      const fake = `0-${createHash('sha256').update('real').digest('hex')}`;
      writeFileSync(join(remote, 'bundles', 'README'), 'notes');
      writeFileSync(join(remote, 'bundles', fake), gzipSync('forged'));
      const guarded = deus('pull', ...b);
      expect(guarded.code).toBe(0);
      expect(guarded.stderr).toContain('ignored bundles/README on origin: not a bundle name');
      expect(guarded.stderr).toContain(`skipped bundle ${fake} on origin: its text does not hash to its name`);
      rmSync(join(remote, 'bundles', 'README'));
      rmSync(join(remote, 'bundles', fake));

      // A push that leaves out the remote's head is refused, so concurrent work is merged before it lands (D167).
      deus('add', file('x.deus', 'def x : Int := 1\n'), '--message', 'x', ...a);
      deus('push', ...a);
      deus('add', file('y.deus', 'def y : Int := 2\n'), '--message', 'y', ...b);
      const stale = deus('push', ...b, '--no-merge');
      expect(stale.code).not.toBe(0);
      expect(stale.stderr).toContain('run `deus pull origin` and `deus merge origin.main`, then push again');
      // Without --no-merge, the push pulls and merges the remote itself and pushes again (D177).
      const merged = deus('push', ...b);
      expect(merged.code).toBe(0);
      expect(merged.stderr).toContain('origin moved since the last pull; merging it and pushing again');
      expect(deus('pull', ...a).stdout).not.toContain('heads (concurrent pushes)');
      expect(deus('merge', 'origin.main', ...a).stdout).toMatch(/^Fast-forwarded/);
      expect(deus('view', 'y', ...a).stdout).toContain('def y');

      // Group merges (D177) and rehashed dependents (D187) are Replicate.Spec.groupMembersMerge and
      // rehashedDependentTakesBothEdits, cached DEUS tests.

      // Compaction (D73) is Replicate.Spec.compactionKeepsHistory, a cached DEUS test; the refusal to trim history stays.
      const refused = deus('compact', '--keep', '3', ...a);
      expect(refused.code).toBe(1);
      expect(refused.stderr).toContain('compact keeps the whole history');

      // A forged object (D91) is Replicate.Spec.pullSkipsForgedObjects, a cached DEUS test.
    }),
  );

  test(
    'tracks tasks attached to definitions and changes, merged and replicated with the code',
    { timeout: 120_000 },
    kept(({ expect }) => {
      const c = ['--codebase', join(scratch, 'tasks')];
      deus('init', '--empty', ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
      const shapes = file(
        'tasks-shapes.deus',
        'namespace Shapes\ndef square (side : Int) : Int := side * side\nend Shapes\n',
      );
      deus('add', shapes, ...c);
      type TaskRow = {
        id: string;
        title: string;
        state: string;
        priority: number;
        assignee: string;
        comments: { note: string }[];
      };
      const task = (...args: string[]): TaskRow => JSON.parse(deus('task', ...args, '--json', ...c).stdout);
      const bug = task(
        'new',
        'Square',
        'overflows',
        '--priority',
        'high',
        '--labels',
        'bug,math',
        '--link',
        'Shapes.square',
      );
      expect(bug).toMatchObject({ title: 'Square overflows', state: 'todo', priority: 2 });
      const docs = task('new', 'Document', 'shapes');
      task('set', bug.id, '--state', 'doing', '--assignee', 'agent-x');
      task('comment', bug.id, 'Use', 'a', 'checked', 'multiply.', '--by', 'agent-x');
      const listed = (...args: string[]): string[] =>
        JSON.parse(deus('task', 'list', ...args, '--json', ...c).stdout).map((row: TaskRow) => row.id);
      expect(listed('--about', 'Shapes.square')).toEqual([bug.id]);
      expect(listed()).toEqual([bug.id, docs.id]);

      // The change that fixes a task closes it and is linked from it.
      writeFileSync(shapes, 'namespace Shapes\ndef square (side : Int) : Int := side * side + 0\nend Shapes\n');
      const update = JSON.parse(deus('update', shapes, '--closes', bug.id.slice(0, 4), '--json', ...c).stdout);
      expect(listed()).toEqual([docs.id]);
      const shown = JSON.parse(deus('task', 'show', bug.id, '--json', ...c).stdout);
      expect(shown.task).toMatchObject({
        state: 'done',
        assignee: 'agent-x',
        comments: [{ author: 'agent-x', note: 'Use a checked multiply.' }],
      });
      expect(shown.links[0].current).not.toBe(shown.links[0].hash);
      expect(shown.links[0].changes[0].causal).toBe(update.causal);
      expect(shown.links[1]).toMatchObject({ change: update.causal });
      expect(shown.history.find((row: { message: string }) => row.message.startsWith('task: comment'))).toMatchObject({
        by: 'agent-x',
      });
      expect(shown.history.map((row: { message: string }) => row.message)).toEqual([
        `close ${bug.id} by #${update.causal.slice(0, 10)}`,
        `task: comment on ${bug.id}`,
        `task: set ${bug.id} state assignee`,
        `task: open ${bug.id} Square overflows`,
      ]);

      // Tasks merge field by field; a field changed differently on both sides is a conflict.
      deus('branch', 'side', ...c);
      deus('switch', 'side', ...c);
      task('set', docs.id, '--priority', 'low');
      task('comment', docs.id, 'from', 'side');
      deus('switch', 'main', ...c);
      task('set', docs.id, '--assignee', 'bob');
      task('comment', docs.id, 'from', 'main');
      expect(deus('merge', 'side', ...c).code).toBe(0);
      const merged = JSON.parse(deus('task', 'show', docs.id, '--json', ...c).stdout).task;
      expect(merged).toMatchObject({ priority: 4, assignee: 'bob' });
      expect(merged.comments.map((comment: { note: string }) => comment.note)).toEqual(['from main', 'from side']);
      deus('branch', 'rename', ...c);
      deus('switch', 'rename', ...c);
      task('set', docs.id, '--title', 'Doc A');
      deus('switch', 'main', ...c);
      task('set', docs.id, '--title', 'Doc B');
      expect(JSON.parse(deus('merge', 'rename', '--json', ...c).stdout).names).toEqual([`task:${docs.id}.title`]);

      // Tasks travel in bundles.
      const copy = ['--codebase', join(scratch, 'tasks-copy')];
      deus('remote', 'add', 'origin', join(scratch, 'tasks-remote'), ...c);
      deus('push', ...c);
      deus('init', '--empty', ...copy);
      deus('remote', 'add', 'origin', join(scratch, 'tasks-remote'), ...copy);
      deus('pull', ...copy);
      deus('merge', 'origin.main', ...copy);
      expect(
        JSON.parse(deus('task', 'list', '--all', '--json', ...copy).stdout).map((row: TaskRow) => row.title),
      ).toEqual(['Doc B', 'Square overflows']);

      // The explorer's task board reads tasks.json: links resolved against the current names, and history.
      process.env.DEUS_HOME = root;
      const site = join(scratch, 'tasks-site');
      deus('explore', '--out', site, ...c);
      const board = JSON.parse(readFileSync(join(site, 'tasks.json'), 'utf8'));
      const shownBug = board.find((row: { id: string }) => row.id === bug.id);
      expect(shownBug.state).toBe('done');
      expect(shownBug.links[0].current).not.toBe(shownBug.links[0].hash);
      expect(shownBug.history).toHaveLength(4);
      expect(JSON.parse(readFileSync(join(site, 'meta.json'), 'utf8'))).toMatchObject({ tasks: 2, open: 1 });

      // An export restores the same names, hashes and tasks in an empty codebase.
      const exported = join(scratch, 'tasks-export');
      expect(JSON.parse(deus('export', exported, '--json', ...c).stdout)).toMatchObject({ tasks: 2 });
      const staleTasks = readFileSync(join(exported, 'tasks.sexp'), 'utf8');
      expect(readFileSync(join(exported, 'TASKS.md'), 'utf8')).toContain(`## Square overflows (\`${bug.id}\`)`);
      const restored = ['--codebase', join(scratch, 'tasks-restored')];
      deus('init', '--empty', ...restored);
      expect(deus('add', join(exported, 'code'), ...restored).code).toBe(0);
      expect(deus('task', 'import', join(exported, 'tasks.sexp'), ...restored).stdout).toBe('Imported 2 tasks.\n');
      const listing = (args: string[]) => JSON.parse(deus('ls', '--json', ...args).stdout);
      expect(listing(restored)).toEqual(listing(c));
      expect(deus('task', 'list', '--all', '--json', ...restored).stdout).toBe(
        deus('task', 'list', '--all', '--json', ...c).stdout,
      );

      // Two codebases exporting to one directory merge what the other wrote there (D79).
      deus('task', 'set', docs.id, '--state', 'done', '--json', ...restored);
      expect(deus('export', exported, ...restored).code).toBe(0);
      task('set', docs.id, '--assignee', 'carol');
      expect(deus('export', exported, ...c).code).toBe(0);
      expect(JSON.parse(deus('task', 'show', docs.id, '--json', ...c).stdout).task).toMatchObject({
        state: 'done',
        assignee: 'carol',
      });
      const history = readFileSync(join(exported, 'history.sexp'), 'utf8');
      expect(history).toContain(`task: set ${docs.id} state`);
      expect(history).toContain(`task: set ${docs.id} assignee`);
      expect(deus('export', exported, ...restored).code).toBe(0);
      expect(JSON.parse(deus('task', 'show', docs.id, '--json', ...restored).stdout).task).toMatchObject({
        state: 'done',
        assignee: 'carol',
      });

      // A writer that never merged leaves old versions and drops tasks; neither reverts or deletes anything.
      const tasksBefore = deus('task', 'list', '--all', '--json', ...c).stdout;
      writeFileSync(
        join(exported, 'tasks.sexp'),
        staleTasks
          .split('\n')
          .filter((line) => !line.includes(bug.id))
          .join('\n'),
      );
      expect(deus('export', exported, ...c).code).toBe(0);
      expect(deus('task', 'list', '--all', '--json', ...c).stdout).toBe(tasksBefore);
      // A git union merge leaves both versions of a task; the one this codebase has not had wins (D89).
      const current = readFileSync(join(exported, 'tasks.sexp'), 'utf8');
      writeFileSync(join(exported, 'tasks.sexp'), current + staleTasks);
      expect(deus('export', exported, ...c).code).toBe(0);
      expect(deus('task', 'list', '--all', '--json', ...c).stdout).toBe(tasksBefore);
    }),
  );
});
