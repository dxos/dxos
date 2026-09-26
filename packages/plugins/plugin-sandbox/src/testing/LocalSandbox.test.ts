//
// Copyright 2026 DXOS.org
//

import { createSandboxManager } from '@carderne/sandbox-runtime';
import { afterAll, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Client, ClientService } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Blob, Collection, Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestContextService } from '@dxos/effect/testing';
import { File } from '@dxos/types';

import { Sandbox, SandboxOperation } from '#types';

import { SANDBOX_BACKEND_ENV } from '../services/resolve-backend.ts';
import { SandboxHandlers } from '../skills/functions/index.ts';
import SandboxSkill from '../skills/sandbox-skill.ts';

const probe = createSandboxManager();
const unavailable = !probe.isSupportedPlatform() || probe.checkDependencies().errors.length > 0;

// Read when the handlers first resolve the backend, so set before any test runs.
const root = mkdtempSync(join(tmpdir(), 'dx-sandbox-ops-'));
process.env[SANDBOX_BACKEND_ENV] = 'local';
process.env.DX_SANDBOX_ROOT = root;

// A 1x1 red PNG.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFAAH/VscvDQAAAABJRU5ErkJggg==';
const PNG_BYTES = Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));

const TestLayer = AssistantTestLayer({
  operationHandlers: SandboxHandlers,
  types: [Sandbox.Sandbox, File.File, Blob.Blob, Collection.Collection, Skill.Skill, Feed.Feed],
  skills: [SandboxSkill.make()],
  // The operations declare the client for EDGE; the local backend never touches it.
  extraServices: Layer.sync(ClientService, () => new Client()),
});

describe.skipIf(unavailable)('SandboxPlugin (local backend)', { timeout: 60_000 }, () => {
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it.effect('creates a sandbox and runs commands in it', (ctx) =>
    Effect.gen(function* () {
      const { sandboxId } = yield* Operation.invoke(SandboxOperation.CreateSandbox, { name: 'local-test' });
      const [sandbox] = yield* Database.query(Filter.type(Sandbox.Sandbox)).run;
      expect(Obj.getURI(sandbox)).toBe(sandboxId);
      expect(sandbox.baseImage).toBe('local');
      expect(sandbox.createdAt).toBeTruthy();

      const result = yield* Operation.invoke(SandboxOperation.Exec, {
        sandbox: Ref.make(sandbox),
        command: 'echo hello world\necho "$WORKSPACE"',
      });
      expect(result).toMatchObject({ exitCode: 0, success: true });
      expect(result.stdout).toBe(`hello world\n${join(root, sandbox.id, 'workspace')}\n`);
    }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
  );

  it.effect('reports a failing command as a result', (ctx) =>
    Effect.gen(function* () {
      const sandbox = Sandbox.make({ name: 'fail-test' });
      yield* Database.add(sandbox);
      const result = yield* Operation.invoke(SandboxOperation.Exec, {
        sandbox: Ref.make(sandbox),
        command: 'sleep 10',
        timeout: 1_000,
      });
      expect(result).toMatchObject({ exitCode: -1, success: false });
      expect(result.stderr).toContain('timed out');
    }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
  );

  it.effect('uploads and downloads binary files', (ctx) =>
    Effect.gen(function* () {
      const sandbox = Sandbox.make({ name: 'file-test' });
      yield* Database.add(sandbox);

      const upload = yield* File.fromBytes(PNG_BYTES, { name: 'in.png', type: 'image/png' });
      yield* Database.add(upload);
      yield* Operation.invoke(SandboxOperation.UploadFile, {
        sandbox: Ref.make(sandbox),
        file: Ref.make(upload),
        path: '/workspace/in.png',
      });

      const copied = yield* Operation.invoke(SandboxOperation.Exec, {
        sandbox: Ref.make(sandbox),
        command: 'cp in.png out.png',
      });
      expect(copied.success).toBe(true);

      const { objectId } = yield* Operation.invoke(SandboxOperation.DownloadFile, {
        sandbox: Ref.make(sandbox),
        path: '/workspace/out.png',
      });
      const files = yield* Database.query(Filter.type(File.File)).run;
      const downloaded = Option.getOrThrow(Option.fromNullishOr(files.find((file) => Obj.getURI(file) === objectId)));
      expect(downloaded.name).toBe('out.png');
      const blob = yield* Database.load(downloaded.data);
      expect(blob.type).toBe('image/png');
      expect(yield* Blob.read(blob)).toEqual(PNG_BYTES);
    }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
  );
});
