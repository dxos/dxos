//
// Copyright 2026 DXOS.org
//

import { createSandboxManager } from '@carderne/sandbox-runtime';
import { afterAll, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import { EffectEx } from '@dxos/effect';

import { LocalSandboxBackend, type LocalSandboxOptions, sniffMimeType, toolchainDirs } from './LocalSandboxBackend.ts';

const SPACE_ID = 'space-a';

// Runs only where the OS sandbox is available (bubblewrap + socat + ripgrep on Linux; macOS).
const probe = createSandboxManager();
const unavailable = !probe.isSupportedPlatform() || probe.checkDependencies().errors.length > 0;

// A 1x1 red PNG.
const PNG_BYTES = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFAAH/VscvDQAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
);

describe.skipIf(unavailable)('LocalSandboxBackend', { timeout: 60_000 }, () => {
  const backends: LocalSandboxBackend[] = [];
  const cleanup: string[] = [];

  const makeBackend = (options: Omit<LocalSandboxOptions, 'root'> = {}) =>
    Effect.gen(function* () {
      const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'dx-sandbox-test-')));
      cleanup.push(root);
      const backend = new LocalSandboxBackend({ root, ...options });
      backends.push(backend);
      return backend;
    });

  let counter = 0;
  const nextId = () => `sbx${Date.now()}x${counter++}`;

  afterAll(async () => {
    await EffectEx.runPromise(Effect.forEach(backends, (backend) => backend.close(), { discard: true }));
    await Promise.all(cleanup.map((path) => rm(path, { recursive: true, force: true })));
  });

  it.effect('runs a command in the workspace', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      const record = yield* backend.create(SPACE_ID, id, { name: 'test' });
      expect(record).toMatchObject({ id, spaceId: SPACE_ID, name: 'test', baseImage: 'local' });

      const result = yield* backend.exec(SPACE_ID, id, { command: 'echo hello world; pwd; echo "$HOME"' });
      const workspace = join(backend.root, id, 'workspace');
      expect(result).toMatchObject({ exitCode: 0, success: true, stdout: `hello world\n${workspace}\n${workspace}\n` });

      const failed = yield* backend.exec(SPACE_ID, id, { command: 'echo oops >&2; exit 3' });
      expect(failed).toMatchObject({ exitCode: 3, success: false, stderr: 'oops\n' });
    }),
  );

  it.effect('runs multi-line commands with quotes and heredocs intact', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      const result = yield* backend.exec(SPACE_ID, id, {
        command: `cat > note.txt <<'EOF'\nit's "quoted" $HOME\nEOF\ncat note.txt`,
        cwd: '/workspace',
      });
      expect(result.stdout).toBe(`it's "quoted" $HOME\n`);
    }),
  );

  it.effect('transfers files byte for byte between the host and the sandbox', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      yield* backend.writeFile(SPACE_ID, id, '/workspace/img/in.png', PNG_BYTES);
      const copied = yield* backend.exec(SPACE_ID, id, { command: 'cp img/in.png img/out.png && ls img' });
      expect(copied.stdout).toBe('in.png\nout.png\n');

      const { bytes, type } = yield* backend.readFileBytes(SPACE_ID, id, '/workspace/img/out.png');
      expect(bytes).toEqual(PNG_BYTES);
      expect(type).toBe('image/png');

      const entries = yield* backend.listFiles(SPACE_ID, id, '/workspace');
      expect(entries).toEqual([{ name: 'img', type: 'directory' }]);
    }),
  );

  it.effect('refuses file paths outside the workspace', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      const error = yield* backend.readFileBytes(SPACE_ID, id, '/etc/passwd').pipe(Effect.flip);
      expect(error.message).toMatch(/outside the sandbox workspace/);
      const escape = yield* backend.writeFile(SPACE_ID, id, '../escape.txt', PNG_BYTES).pipe(Effect.flip);
      expect(escape.message).toMatch(/escapes/);
    }),
  );

  it.effect('confines writes to the workspace', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      // Outside the sandboxes root: denied paths are masked by a scratch tmpfs, which takes writes.
      const hostDir = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'dx-sandbox-host-')));
      cleanup.push(hostDir);
      const target = join(hostDir, 'escape.txt');
      const result = yield* backend.exec(SPACE_ID, id, { command: `echo pwned > '${target}'` });
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('Read-only file system');
      expect(existsSync(target)).toBe(false);
    }),
  );

  it.effect("hides the user's home directory and other sandboxes", () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const marker = join(homedir(), `.dx-sandbox-test-${Date.now()}`);
      yield* Effect.promise(() => writeFile(marker, 'secret'));
      cleanup.push(marker);

      const id = nextId();
      const home = yield* backend.exec(SPACE_ID, id, { command: `cat '${marker}'` });
      expect(home.success).toBe(false);
      expect(home.stdout).not.toContain('secret');

      const other = nextId();
      yield* backend.writeFile(SPACE_ID, other, 'secret.txt', new TextEncoder().encode('secret'));
      const otherPath = join(backend.root, other, 'workspace', 'secret.txt');
      const neighbour = yield* backend.exec(SPACE_ID, id, { command: `cat '${otherPath}'` });
      expect(neighbour.success).toBe(false);
      expect(neighbour.stdout).not.toContain('secret');
    }),
  );

  it.effect('never lets the caller configure the host shell', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      const hostDir = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'dx-sandbox-host-')));
      cleanup.push(hostDir);
      const marker = join(hostDir, 'pwned');
      // Staged in the workspace, where a command can write; BASH_ENV would run it in the unconfined host shell.
      yield* backend.writeFile(SPACE_ID, id, 'evil.sh', new TextEncoder().encode(`touch '${marker}'\n`));
      const script = join(backend.root, id, 'workspace', 'evil.sh');
      const result = yield* backend.exec(SPACE_ID, id, { command: 'echo "[$BASH_ENV]"', env: { BASH_ENV: script } });
      expect(result.stdout).toBe(`[${script}]\n`);
      expect(existsSync(marker)).toBe(false);

      const invalid = yield* backend.exec(SPACE_ID, id, { command: 'true', env: { 'A;B': 'x' } }).pipe(Effect.flip);
      expect(invalid.message).toMatch(/Invalid environment variable name/);
    }),
  );

  it.effect('does not follow symlinks out of the workspace in file transfers', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      const secret = join(homedir(), `.dx-sandbox-secret-${Date.now()}`);
      yield* Effect.promise(() => writeFile(secret, 'secret'));
      cleanup.push(secret);
      const hostDir = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'dx-sandbox-host-')));
      cleanup.push(hostDir);
      const hostFile = join(hostDir, 'rc');
      yield* Effect.promise(() => writeFile(hostFile, 'original'));

      yield* backend.exec(SPACE_ID, id, {
        command: `ln -s '${secret}' key && ln -s '${hostFile}' rc && ln -s '${hostDir}' dir && ln -s '${homedir()}' home`,
      });

      const read = yield* backend.readFileBytes(SPACE_ID, id, 'key').pipe(Effect.flip);
      expect(read.message).not.toContain('secret\n');
      yield* backend.writeFile(SPACE_ID, id, 'rc', new TextEncoder().encode('overwritten')).pipe(Effect.flip);
      yield* backend.writeFile(SPACE_ID, id, 'dir/new', new TextEncoder().encode('planted')).pipe(Effect.flip);
      expect(yield* Effect.promise(() => readFile(hostFile, 'utf8'))).toBe('original');
      expect(existsSync(join(hostDir, 'new'))).toBe(false);
      // File transfers see what a command sees: the home directory stays hidden through a link.
      const listed = yield* backend.listFiles(SPACE_ID, id, 'home').pipe(Effect.orElseSucceed(() => []));
      expect(listed.map(({ name }) => name)).not.toContain(secret.split('/').at(-1));
    }),
  );

  it.effect("does not inherit the host's environment", () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      process.env.DX_SANDBOX_TEST_SECRET = 'secret';
      const result = yield* backend
        .exec(SPACE_ID, nextId(), {
          command: 'echo "[$DX_SANDBOX_TEST_SECRET][$GIVEN]"',
          env: { GIVEN: 'given' },
        })
        .pipe(Effect.ensuring(Effect.sync(() => delete process.env.DX_SANDBOX_TEST_SECRET)));
      expect(result.stdout).toBe('[][given]\n');
    }),
  );

  it.effect('blocks hosts that are not allowed', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend({ allowedDomains: [] });
      const result = yield* backend.exec(SPACE_ID, nextId(), {
        command: `node -e "fetch('https://example.com').then(() => console.log('reached'), () => process.exit(7))"`,
      });
      expect(result.stdout).not.toContain('reached');
      expect(result.exitCode).toBe(7);
    }),
  );

  // Live clock: the check afterwards waits out real seconds, which the test clock would never pass.
  it.live('kills a command and its children at the timeout', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      const started = Date.now();
      const result = yield* backend.exec(SPACE_ID, id, {
        command: '(sleep 5; touch late.txt) & sleep 30',
        timeout: 1_000,
      });
      expect(Date.now() - started).toBeLessThan(10_000);
      expect(result).toMatchObject({ exitCode: -1, success: false });
      expect(result.stderr).toContain('command timed out after 1000ms and was killed');

      // The background child went down with the group, so it never writes.
      yield* Effect.sleep('6 seconds');
      const listed = yield* backend.listFiles(SPACE_ID, id, '/workspace');
      expect(listed).toEqual([]);
    }),
  );

  it.effect('enforces the CPU limit', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend({ limits: { cpuSeconds: 1 } });
      const result = yield* backend.exec(SPACE_ID, nextId(), { command: 'while :; do :; done', timeout: 30_000 });
      // 128 + SIGXCPU.
      expect(result.exitCode).toBe(152);
    }),
  );

  it.effect.skipIf(process.platform !== 'linux')('enforces the memory limit', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend({ limits: { memoryMiB: 1536 } });
      const id = nextId();
      const small = yield* backend.exec(SPACE_ID, id, {
        command: `node -e "Buffer.alloc(64 * 1024 * 1024, 1); console.log('ok')"`,
      });
      expect(small.stdout).toBe('ok\n');

      const large = yield* backend.exec(SPACE_ID, id, {
        command: `node -e "Buffer.alloc(2048 * 1024 * 1024, 1); console.log('ok')"`,
      });
      expect(large.success).toBe(false);
      expect(large.stdout).not.toContain('ok');
    }),
  );

  it.effect('enforces the file size limit', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend({ limits: { fileSizeMiB: 1 } });
      const id = nextId();
      const result = yield* backend.exec(SPACE_ID, id, { command: 'head -c 3145728 /dev/zero > big.bin' });
      expect(result.success).toBe(false);
      const size = (yield* Effect.promise(() => readFile(join(backend.root, id, 'workspace', 'big.bin')))).length;
      expect(size).toBe(1024 * 1024);
    }),
  );

  it.effect('caps captured output', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend({ maxOutputBytes: 100 });
      const result = yield* backend.exec(SPACE_ID, nextId(), { command: 'head -c 1000 /dev/zero | tr "\\0" x' });
      expect(result.stdout).toBe(`${'x'.repeat(100)}\n[900 bytes of output truncated]`);
    }),
  );

  it.effect('keeps a sandbox to the space that created it', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      yield* backend.create(SPACE_ID, id);
      const error = yield* backend.exec('space-b', id, { command: 'true' }).pipe(Effect.flip);
      expect(error.message).toMatch(/belongs to another space/);
    }),
  );

  it.effect('destroys a sandbox', () =>
    Effect.gen(function* () {
      const backend = yield* makeBackend();
      const id = nextId();
      yield* backend.exec(SPACE_ID, id, { command: 'echo hi > a.txt' });
      yield* backend.destroy(SPACE_ID, id);
      expect(existsSync(join(backend.root, id))).toBe(false);
    }),
  );
});

describe('sniffMimeType', () => {
  it('detects types from content', () => {
    expect(sniffMimeType(PNG_BYTES)).toBe('image/png');
    expect(sniffMimeType(new TextEncoder().encode('héllo'))).toBe('text/plain');
    expect(sniffMimeType(Uint8Array.of(0xff, 0xfe, 0x00, 0x80))).toBe('application/octet-stream');
  });
});

describe('toolchainDirs', () => {
  it('re-allows exactly the PATH entries under home', () => {
    expect(
      toolchainDirs('/home/me', ['/home/me/.local/bin', '/usr/bin', '/home/me', '/home/me/.bun/bin', 'rel/bin', '']),
    ).toEqual(['/home/me/.local/bin', '/home/me/.bun/bin']);
  });
});
