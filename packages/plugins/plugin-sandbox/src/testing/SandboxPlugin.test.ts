//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Blob, Collection, Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestContextService } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { File } from '@dxos/types';

import { Sandbox, SandboxOperation } from '#types';

import { SandboxHandlers } from '../skills/functions/index.ts';
import SandboxSkill from '../skills/sandbox-skill.ts';

EntityId.dangerouslyDisableRandomness();

// A 1x1 red PNG: 70 bytes, small enough to write into the sandbox from a shell literal.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFAAH/VscvDQAAAABJRU5ErkJggg==';
const PNG_BYTES = Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));

const TestLayer = AssistantTestLayer({
  operationHandlers: SandboxHandlers,
  types: [Sandbox.Sandbox, File.File, Blob.Blob, Collection.Collection, Skill.Skill, Feed.Feed],
  skills: [SandboxSkill.make()],
});

// Requires a running sandbox-service worker (`runtime.services.sandbox.url`). Disabled by default.
describe.skip('SandboxPlugin', () => {
  it.effect(
    'create sandbox',
    (ctx) =>
      Effect.gen(function* () {
        const result = yield* Operation.invoke(SandboxOperation.CreateSandbox, { name: 'test-sandbox' });
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

        const result = yield* Operation.invoke(SandboxOperation.Exec, {
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
        const fileObj = yield* File.fromBytes(bytes, { name: 'test.txt', type: 'text/plain' });
        yield* Database.add(fileObj);

        yield* Operation.invoke(SandboxOperation.UploadFile, {
          sandbox: Ref.make(sandbox),
          file: Ref.make(fileObj),
          path: '/workspace/test.txt',
        });

        const downloadResult = yield* Operation.invoke(SandboxOperation.DownloadFile, {
          sandbox: Ref.make(sandbox),
          path: '/workspace/test.txt',
        });

        expect(downloadResult.objectId).toBeTruthy();
      }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
    60_000,
  );

  it.effect(
    'download image file',
    (ctx) =>
      Effect.gen(function* () {
        const sandbox = Sandbox.make({ name: 'image-test' });
        yield* Database.add(sandbox);

        // Written inside the sandbox so the bytes never pass through the text-only upload path.
        const written = yield* Operation.invoke(SandboxOperation.Exec, {
          sandbox: Ref.make(sandbox),
          command: `printf '%s' '${PNG_BASE64}' | base64 -d > /workspace/test.png`,
        });
        expect(written.success).toBe(true);

        const downloadResult = yield* Operation.invoke(SandboxOperation.DownloadFile, {
          sandbox: Ref.make(sandbox),
          path: '/workspace/test.png',
        });

        const files = yield* Database.query(Filter.type(File.File)).run;
        const fileObj = Option.getOrThrow(
          Option.fromNullishOr(files.find((file) => Obj.getURI(file) === downloadResult.objectId)),
        );
        expect(fileObj.name).toBe('test.png');
        const blob = yield* Database.load(fileObj.data);
        expect(blob.type).toBe('image/png');
        expect(blob.size).toBe(PNG_BYTES.byteLength);
        expect(yield* Blob.read(blob)).toEqual(PNG_BYTES);

        // Served through the blob's URL, a browser sees an image: the type is on the response, and
        // the body is the PNG byte for byte.
        const url = Option.getOrThrow(yield* Blob.url(blob));
        const response = yield* Effect.promise(() => fetch(url));
        expect(response.headers.get('content-type')).toBe('image/png');
        expect(new Uint8Array(yield* Effect.promise(() => response.arrayBuffer()))).toEqual(PNG_BYTES);
      }).pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, ctx)),
    60_000,
  );
});
