//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation, Skill } from '@dxos/compute';
import { Collection, Database, Feed, Ref } from '@dxos/echo';
import { TestContextService } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';
import { File } from '@dxos/types';

import { CreateSandbox, DownloadFile, Exec, SandboxHandlers, UploadFile } from '../skills/functions';
import SandboxSkill from '../skills/sandbox-skill';
import * as Sandbox from '../types/Sandbox';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: SandboxHandlers,
  types: [Sandbox.Sandbox, File.File, Collection.Collection, Skill.Skill, Feed.Feed],
  skills: [SandboxSkill.make()],
});

// Requires a running sandbox-service worker (`runtime.services.sandbox.url`). Disabled by default.
describe.skip('SandboxPlugin', () => {
  it.effect(
    'create sandbox',
    (ctx) =>
      Effect.gen(function* () {
        const result = yield* Operation.invoke(CreateSandbox, { name: 'test-sandbox' });
        expect(result.sandboxId).toBeTruthy();
      }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
    60_000,
  );

  it.effect(
    'exec command',
    (ctx) =>
      Effect.gen(function* () {
        const sandbox = Sandbox.make({ name: 'exec-test' });
        yield* Database.add(sandbox);

        const result = yield* Operation.invoke(Exec, {
          sandbox: Ref.make(sandbox),
          command: 'echo hello world',
        });

        expect(result.exitCode).toBe(0);
        expect(result.success).toBe(true);
        expect(result.stdout.trim()).toBe('hello world');
      }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
    60_000,
  );

  it.effect(
    'upload and download file',
    (ctx) =>
      Effect.gen(function* () {
        const sandbox = Sandbox.make({ name: 'file-test' });
        yield* Database.add(sandbox);

        const content = 'Hello from ECHO!';
        const bytes = new TextEncoder().encode(content);
        const fileObj = File.make({
          name: 'test.txt',
          type: 'text/plain',
          size: bytes.byteLength,
          data: File.inlineData(bytes),
        });
        yield* Database.add(fileObj);

        yield* Operation.invoke(UploadFile, {
          sandbox: Ref.make(sandbox),
          file: Ref.make(fileObj),
          path: '/workspace/test.txt',
        });

        const downloadResult = yield* Operation.invoke(DownloadFile, {
          sandbox: Ref.make(sandbox),
          path: '/workspace/test.txt',
        });

        expect(downloadResult.objectId).toBeTruthy();
      }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
    60_000,
  );
});
