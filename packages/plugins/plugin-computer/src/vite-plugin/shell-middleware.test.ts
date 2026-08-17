//
// Copyright 2026 DXOS.org
//

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Shell } from '#shell';

import { type Host, startHost } from './testing';

describe('shell middleware', () => {
  let root: string;
  let host: Host;

  beforeAll(async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dx-computer-exec-')));
    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(path.join(root, 'nested', 'marker.txt'), 'found me\n');
    host = await startHost({ root });
  });

  afterAll(async () => {
    await host.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('runs a script in the root', async ({ expect }) => {
    const result = await Shell.exec({ script: 'pwd' }, { path: host.path });
    expect(result.exitCode).to.eq(0);
    expect(result.stdout.trim()).to.eq(root);
    expect(result.cwd).to.eq(root);
    expect(result.timedOut).to.be.false;
    expect(result.truncated).to.be.false;
  });

  test('runs in a requested subdirectory', async ({ expect }) => {
    const result = await Shell.exec({ script: 'cat marker.txt', cwd: 'nested' }, { path: host.path });
    expect(result.stdout).to.eq('found me\n');
  });

  test('reports a non-zero exit as a result', async ({ expect }) => {
    const result = await Shell.exec({ script: 'echo oops >&2; exit 3' }, { path: host.path });
    expect(result.exitCode).to.eq(3);
    expect(result.stderr.trim()).to.eq('oops');
    expect(result.stdout).to.eq('');
  });

  test('delivers stdin to the script', async ({ expect }) => {
    const result = await Shell.exec({ script: 'cat', stdin: 'piped payload' }, { path: host.path });
    expect(result.stdout).to.eq('piped payload');
  });

  test('a script that ignores stdin still succeeds', async ({ expect }) => {
    // The child closes the pipe under us; an unhandled EPIPE here would take the dev server down.
    const result = await Shell.exec({ script: 'echo hi', stdin: 'x'.repeat(128 * 1024) }, { path: host.path });
    expect(result.exitCode).to.eq(0);
    expect(result.stdout).to.eq('hi\n');
  });

  test('clips output at the host cap', async ({ expect }) => {
    const clipped = await startHost({ root, maxOutputChars: 64 });
    try {
      const result = await Shell.exec({ script: "printf 'a%.0s' {1..200}" }, { path: clipped.path });
      expect(result.truncated).to.be.true;
      expect(result.stdout).to.have.length(64);
    } finally {
      await clipped.close();
    }
  });

  test('kills a script that outruns its timeout, and the group it spawned', async ({ expect }) => {
    // The backgrounded child would write `survivor` after the kill deadline, so its absence is what
    // distinguishes killing the group from killing only the shell. Real time, not a TestClock: the
    // thing under test is an OS process outliving the request.
    const result = await Shell.exec({ script: '(sleep 1; touch survivor) & wait', timeout: 250 }, { path: host.path });
    expect(result.timedOut).to.be.true;
    expect(result.exitCode).to.be.null;
    expect(result.durationMs).to.be.lessThan(10_000);

    await new Promise((resolve) => setTimeout(resolve, 1_500));
    expect(fs.existsSync(path.join(root, 'survivor')), 'the spawned process group outlived the request').to.be.false;
  });

  test('refuses a working directory outside the root', async ({ expect }) => {
    await expect(Shell.exec({ script: 'pwd', cwd: '../..' }, { path: host.path })).rejects.toThrow(/refused/);
  });

  test('refuses an empty script', async ({ expect }) => {
    await expect(Shell.exec({ script: '   ' }, { path: host.path })).rejects.toThrow(/refused/);
  });

  test('refuses a request that is not declared as JSON', async ({ expect }) => {
    // The gate that makes the route same-origin-only: a cross-origin page can send text/plain
    // without a preflight, but not application/json.
    const response = await fetch(host.path, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ script: 'echo pwned' }),
    });
    expect(response.status).to.eq(415);
  });

  test('refuses a cross-origin request that declares itself', async ({ expect }) => {
    const response = await fetch(host.path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'origin': 'https://evil.example' },
      body: JSON.stringify({ script: 'echo pwned' }),
    });
    expect(response.status).to.eq(403);
  });

  test('treats an opaque origin as cross-origin', async ({ expect }) => {
    // A sandboxed frame sends `Origin: null`, which is not a parseable URL.
    const response = await fetch(host.path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'origin': 'null' },
      body: JSON.stringify({ script: 'echo pwned' }),
    });
    expect(response.status).to.eq(403);
  });

  test('falls back to the default timeout when the requested one is unusable', async ({ expect }) => {
    // Straight over the wire, since `NaN` reaching `setTimeout` kills the script on the next tick.
    const response = await fetch(host.path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ script: 'echo hi', timeout: 'soon' }),
    });
    const result: Shell.Result = await response.json();
    expect(result.timedOut).to.be.false;
    expect(result.exitCode).to.eq(0);
    expect(result.stdout).to.eq('hi\n');
  });

  test('passes other requests through', async ({ expect }) => {
    const response = await fetch(host.path.replace(Shell.PATH, '/elsewhere'));
    expect(response.status).to.eq(404);
  });

  test('a host without the route reads as not mounted', async ({ expect }) => {
    // The skill's instructions tell the model to report this failure rather than retry it.
    await expect(Shell.exec({ script: 'pwd' }, { path: host.path.replace(Shell.PATH, '/elsewhere') })).rejects.toThrow(
      /not mounted/,
    );
  });
});
