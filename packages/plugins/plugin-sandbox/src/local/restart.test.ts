//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { afterAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { parseReadyLine } from '../capabilities/local-launcher.ts';
import * as HttpBackend from '../services/HttpBackend.ts';
import { canRunLocalSandboxes } from '../testing/probe.ts';

const unavailable = !(await canRunLocalSandboxes());

const TOKEN = 'r'.repeat(64);
const SPACE_ID = 'space-restart';
const SIDECAR = new URL('../bin/dx-sandbox.ts', import.meta.url).pathname;

/** The fragment of a built plugin the app's loader fetches first. */
const MANIFEST = JSON.stringify({ id: 'org.example.world-clock', name: 'World Clock', entry: 'plugin.mjs' });

type Helper = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly port: number;
  readonly url: string;
  readonly backend: ReturnType<typeof HttpBackend.make>;
};

/**
 * Starts the `dx-sandbox` helper as its own OS process, as the desktop app does, so a restart is a
 * real process death: nothing the helper held in memory survives, only what it wrote under `root`.
 */
const startHelper = async (root: string, env: Record<string, string> = {}): Promise<Helper> => {
  const child = spawn('bun', [SIDECAR], {
    env: { PATH: process.env.PATH, DX_SANDBOX_ROOT: root, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stderr: string[] = [];
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk.toString('utf8')));
  child.stdin.write(`${TOKEN}\n`);
  const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
  const first = await Promise.race([
    lines.next(),
    new Promise<never>((_, reject) =>
      child.once('exit', (code) => reject(new Error(`helper exited ${code}: ${stderr.join('')}`))),
    ),
  ]);
  const port = parseReadyLine(first.done ? '' : first.value);
  const url = `http://localhost:${port}`;
  return { child, port, url, backend: HttpBackend.make(url, TOKEN) };
};

/** Kills the helper the way a crashed or force-quit app does: no chance to clean up. */
const killHelper = async ({ child }: Helper): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.kill('SIGKILL');
  await exited;
};

const run = EffectEx.runPromise;

/**
 * Exploration of what a local sandbox keeps across a restart of the process that owns it — the
 * desktop app's `dx-sandbox` helper — and what has to be re-established afterwards. Written against
 * the "plugin loads 404 after restarting the app" report: these tests pin down the current behaviour
 * so a fix shows up as a deliberate change to them.
 */
describe.skipIf(unavailable)('local sandbox across a helper restart', { timeout: 120_000 }, () => {
  const helpers: Helper[] = [];
  const cleanup: string[] = [];

  const makeRoot = async (): Promise<string> => {
    const root = await mkdtemp(join(tmpdir(), 'dx-sandbox-restart-'));
    cleanup.push(root);
    return root;
  };

  const start = async (root: string, env?: Record<string, string>): Promise<Helper> => {
    const helper = await startHelper(root, env);
    helpers.push(helper);
    return helper;
  };

  /** Builds a tiny "plugin" into `dist/` inside the sandbox, the way the agent's build step does. */
  const buildPlugin = (helper: Helper, sandboxId: string) =>
    run(
      helper.backend.exec(SPACE_ID, sandboxId, {
        command: [
          'mkdir -p dist',
          `printf '%s' '${MANIFEST}' > dist/manifest.json`,
          `printf 'export default "world-clock";' > dist/plugin.mjs`,
        ].join('\n'),
      }),
    );

  afterAll(async () => {
    await Promise.all(helpers.map(killHelper));
    await Promise.all(cleanup.map((path) => rm(path, { recursive: true, force: true })));
  });

  test('the record, workspace files and build output survive the helper being killed', async () => {
    const root = await makeRoot();
    const first = await start(root);
    const record = await run(first.backend.create(SPACE_ID, 'sbx-survive', { name: 'World Clock' }));
    expect((await buildPlugin(first, 'sbx-survive')).success).toBe(true);
    await killHelper(first);

    // What a restarted helper finds is exactly what the first one wrote to disk.
    expect(JSON.parse(await readFile(join(root, 'sbx-survive', 'sandbox.json'), 'utf8'))).toEqual(record);

    const second = await start(root);
    expect(second.port).not.toBe(first.port);
    // `create` on an existing id answers the stored record rather than a new one, so the ECHO object
    // the app holds keeps pointing at the same sandbox.
    expect(await run(second.backend.create(SPACE_ID, 'sbx-survive', { name: 'ignored' }))).toEqual(record);
    const listing = await run(second.backend.listFiles(SPACE_ID, 'sbx-survive', 'dist'));
    expect(listing.map(({ name }) => name).sort()).toEqual(['manifest.json', 'plugin.mjs']);
    const manifest = await run(second.backend.readFileBytes(SPACE_ID, 'sbx-survive', '/workspace/dist/manifest.json'));
    expect(new TextDecoder().decode(manifest.bytes)).toBe(MANIFEST);

    // Commands run again: the restarted helper re-creates the per-sandbox confinement on first use.
    const result = await run(second.backend.exec(SPACE_ID, 'sbx-survive', { command: 'cat dist/plugin.mjs' }));
    expect(result).toMatchObject({ success: true, stdout: 'export default "world-clock";' });
  });

  test('a URL published before the restart is dead afterwards; republishing mints a working one', async () => {
    const root = await makeRoot();
    const first = await start(root);
    await run(first.backend.create(SPACE_ID, 'sbx-publish', {}));
    await buildPlugin(first, 'sbx-publish');
    const publish = first.backend.publish;
    expect(publish).toBeDefined();
    if (!publish) {
      return;
    }
    const before = await run(publish(SPACE_ID, 'sbx-publish', 'dist'));
    expect((await fetch(`${before}manifest.json`)).status).toBe(200);
    await killHelper(first);

    // The old URL names a port nobody listens on any more.
    await expect(fetch(`${before}manifest.json`)).rejects.toThrow();

    // Even on the new port the old key is unknown: the publish registry lives in the helper's memory.
    const second = await start(root);
    const stale = before.replace(first.url, second.url);
    const staleResponse = await fetch(`${stale}manifest.json`);
    expect(staleResponse.status).toBe(404);

    // Republishing the same directory is the recovery: a fresh key on the new port that serves the build.
    const republish = second.backend.publish;
    if (!republish) {
      return;
    }
    const after = await run(republish(SPACE_ID, 'sbx-publish', 'dist'));
    expect(after).not.toBe(before);
    expect(after.startsWith(`${second.url}/files/`)).toBe(true);
    const response = await fetch(`${after}manifest.json`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual(JSON.parse(MANIFEST));
    expect(await (await fetch(`${after}plugin.mjs`)).text()).toBe('export default "world-clock";');
  });

  test('a process started in the background does not outlive the command that started it', async () => {
    const root = await makeRoot();
    const helper = await start(root);
    await run(helper.backend.create(SPACE_ID, 'sbx-daemon', {}));
    // A dev server an agent starts with `&` and expects to find later.
    const started = await run(
      helper.backend.exec(SPACE_ID, 'sbx-daemon', {
        command: '(while true; do date +%s%N > heartbeat; sleep 0.1; done) & echo $! > daemon.pid; sleep 0.5',
      }),
    );
    expect(started.success).toBe(true);
    const beat = await readFile(join(root, 'sbx-daemon', 'workspace', 'heartbeat'), 'utf8');
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    // The sandbox's pid namespace ends with its command, taking every process in it along.
    expect(await readFile(join(root, 'sbx-daemon', 'workspace', 'heartbeat'), 'utf8')).toBe(beat);

    // So "restarting the server in there" after a helper restart is just running it again, per command.
    await killHelper(helper);
    const restarted = await start(root);
    const again = await run(
      restarted.backend.exec(SPACE_ID, 'sbx-daemon', { command: 'test -f daemon.pid && echo found-pid-file' }),
    );
    expect(again.stdout).toBe('found-pid-file\n');
  });

  // A host whose `realpath` lacks `-e` (macOS's BSD `/usr/bin/realpath`, which a Finder-launched app
  // finds first on its `PATH`) fails every file read, and `/files/` reports any failed read as a 404.
  test('a published file 404s when the host realpath does not accept -e', async () => {
    const shimDir = await makeRoot();
    await mkdir(join(shimDir, 'bin'));
    const shim = join(shimDir, 'bin', 'realpath');
    await writeFile(
      shim,
      [
        '#!/bin/sh',
        'case "$1" in -e) echo "realpath: illegal option -- e" >&2; echo "usage: realpath [-q] [path ...]" >&2; exit 1 ;; esac',
        'exec /usr/bin/realpath "$@"',
        '',
      ].join('\n'),
    );
    await chmod(shim, 0o755);

    const root = await makeRoot();
    const helper = await start(root, { PATH: `${join(shimDir, 'bin')}:${process.env.PATH}` });
    await run(helper.backend.create(SPACE_ID, 'sbx-bsd', {}));
    await buildPlugin(helper, 'sbx-bsd');
    // Listing does not use realpath, so publishing still succeeds and hands out a URL.
    const publish = helper.backend.publish;
    if (!publish) {
      return;
    }
    const base = await run(publish(SPACE_ID, 'sbx-bsd', 'dist'));
    const response = await fetch(`${base}manifest.json`);
    expect(response.status).toBe(404);

    const error = await run(helper.backend.readFileBytes(SPACE_ID, 'sbx-bsd', 'dist/manifest.json').pipe(Effect.flip));
    expect(error.message).toMatch(/^read dist\/manifest.json: /);
  });
});
