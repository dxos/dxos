//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as RegistryDescriptor from '@dxos/app-toolkit/RegistryDescriptor';
import * as Operation from '@dxos/compute/Operation';
import { Blob, JsonSchema, Obj, Type } from '@dxos/echo';
import { File } from '@dxos/types';

import { FileOperationHandlerSet } from '#operations';
import { FileSkill } from '#skills';
import { FileOperation } from '#types';

// Spike evidence for agents/superpowers/specs/2026-10-29-registry-items-in-manifest.md: whether each
// registry item a plugin contributes survives a trip through plain JSON, as a build-emitted descriptor would.
const viaJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const roundTrip = (schema: Type.AnyEntity) => {
  const encoded = JsonSchema.toJsonSchema(schema);
  const decoded = JsonSchema.toEffectSchema(JsonSchema.JsonSchema.make(viaJson(encoded)));
  return { encoded, reencoded: JsonSchema.toJsonSchema(decoded) };
};

describe('registry items as JSON', () => {
  test('a plain object type round-trips exactly, typename and refs included', ({ expect }) => {
    const { encoded, reencoded } = roundTrip(File.File);
    expect(reencoded).toEqual(encoded);
    expect(JSON.stringify(encoded)).toContain(Type.getTypename(File.File));
  });

  test('a type with a bytes transform loses the encoding on the way back', ({ expect }) => {
    const { encoded, reencoded } = roundTrip(Blob.Blob);
    // `Uint8Array` fields encode as base64 strings; the decoded schema forgets they were bytes.
    expect(JSON.stringify(encoded)).toContain('"contentEncoding":"base64"');
    expect(JSON.stringify(reencoded)).not.toContain('contentEncoding');
  });

  test('every file operation serializes, but a non-JSON input becomes an empty schema', ({ expect }) => {
    const all = [
      FileOperation.Create,
      FileOperation.CreateFromSource,
      FileOperation.CreateFromUpload,
      FileOperation.Read,
      FileOperation.ResolveDownload,
    ];
    const records = Operation.serializable(all);
    expect(records).toHaveLength(all.length);

    // `Create` takes a live browser `File`: it is not dropped, it is described as accepting anything.
    const create = records.find((record) => Operation.getKey(record) === String(FileOperation.Create.meta.key));
    expect(viaJson(create?.inputSchema)).toMatchObject({ properties: { file: {}, db: {} } });

    for (const record of records) {
      expect(viaJson(Obj.toJSON(record))).toMatchObject({ name: record.name });
    }
  });

  test('the plugin describes from its module bodies as a thin index plus one file per item', async ({ expect }) => {
    const { index, files, skipped } = await RegistryDescriptor.fromModules([
      {
        id: 'schema',
        provides: [AppCapabilities.Schema.identifier],
        body: (await import('./capabilities/schema.ts')).default,
      },
      {
        id: 'SkillDefinition',
        provides: [AppCapabilities.SkillDefinition.identifier],
        body: (await import('./capabilities/skill-definition.ts')).default,
      },
      {
        id: 'OperationHandler',
        provides: [Capabilities.OperationHandler.identifier],
        body: (await import('./capabilities/operation-handler.ts')).default,
      },
    ]);
    expect(skipped).toEqual([]);
    expect(index.map(({ kind }) => kind)).toEqual([...Array(2).fill('type'), ...Array(5).fill('operation'), 'skill']);
    for (const entry of index) {
      expect(files[entry.path]).toBeDefined();
      expect(entry.path).toContain(entry.hash);
    }
    const descriptorOf = (uri: string) =>
      JSON.parse(files[index.find((entry) => entry.uri === uri)?.path ?? ''] ?? 'null');
    expect(descriptorOf('org.dxos.skill.file').objects[1].content).toContain('You can read the contents of files');
    expect(descriptorOf(String(FileOperation.Create.meta.key))).toMatchObject({ opaqueInputs: ['file', 'db'] });
    // Only the bytes field's encoding is lost; the `_tag` literal re-wrapped in `anyOf` is not counted.
    expect(descriptorOf(String(Type.getURI(Blob.Blob))).lossy).toEqual([
      '/properties/data/anyOf/0/properties/bytes/contentEncoding',
    ]);
    expect(descriptorOf(String(Type.getURI(File.File))).lossy).toEqual([]);

    // The index is what the manifest carries inline; it stays an order of magnitude below what it links to.
    const fileBytes = Object.values(files).reduce((total, source) => total + source.length, 0);
    expect(JSON.stringify(index).length * 5).toBeLessThan(fileBytes);
  });

  test('descriptors are deterministic and rehydrate as ECHO objects', async ({ expect }) => {
    const items = { schemas: [File.File], operations: [FileOperation.Read], skills: [FileSkill] };
    const first = await RegistryDescriptor.describe(items);
    const second = await RegistryDescriptor.describe(items);
    // Content addressing holds only if the random ids `Obj.make` mints are replaced.
    expect(second).toEqual(first);

    const operation = first.index.find(({ kind }) => kind === 'operation');
    const { objects } = JSON.parse(first.files[operation?.path ?? ''] ?? 'null');
    const record = await Obj.fromJSON(objects[0]);
    expect(Obj.getMeta(record).key).toEqual(String(FileOperation.Read.meta.key));
  });

  test('an inline handler map, as a config holds it, describes with no second list of operations', async ({
    expect,
  }) => {
    const inline = Capability.inlineModule('OperationHandler', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed(Capability.contribute(Capabilities.OperationHandler, FileOperationHandlerSet)),
    );
    const { index, skipped } = await RegistryDescriptor.fromModules([
      { id: 'OperationHandler', provides: [Capabilities.OperationHandler.identifier], body: inline },
    ]);
    expect(skipped).toEqual([]);
    expect(index.map(({ uri }) => uri).sort()).toEqual(
      FileOperationHandlerSet.definitions()
        .map((definition) => String(definition.meta.key))
        .sort(),
    );
  });

  test('a skill is a root object plus the text its instructions reference', ({ expect }) => {
    const skill = FileSkill.make();
    // The instructions are a `Ref` to a separate `Text` object, so the skill alone is not self-contained.
    expect(JSON.stringify(Obj.toJSON(skill))).not.toContain('You can read the contents of files');
    const text = skill.instructions.source.target;
    expect(text && JSON.stringify(Obj.toJSON(text))).toContain('You can read the contents of files');
  });
});
