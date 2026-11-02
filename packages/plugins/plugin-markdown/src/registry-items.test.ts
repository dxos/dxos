//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as RegistryDescriptor from '@dxos/app-toolkit/RegistryDescriptor';

// Spike evidence for agents/superpowers/specs/2026-10-29-registry-items-in-manifest.md: the plugin's
// registry items, read from the same module bodies the build loads.
const describeModules = async () =>
  RegistryDescriptor.fromModules([
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

// Per kind, the count; per item, what does not survive JSON.
const summarize = ({ index, files }: RegistryDescriptor.Result) => {
  const counts: Record<string, number> = {};
  const lossy: Record<string, unknown> = {};
  const opaque: Record<string, unknown> = {};
  for (const { kind, uri, path } of index) {
    counts[kind] = (counts[kind] ?? 0) + 1;
    const descriptor = JSON.parse(files[path] ?? 'null');
    if (descriptor?.lossy?.length) {
      lossy[uri] = descriptor.lossy;
    }
    if (descriptor?.opaqueInputs?.length) {
      opaque[uri] = descriptor.opaqueInputs;
    }
  }
  return { counts, lossy, opaque };
};

describe('registry items as JSON', () => {
  test('describes every type, operation and skill; three shared operations take an untyped subject', async ({
    expect,
  }) => {
    const result = await describeModules();
    expect(result.skipped).toEqual([]);
    expect(summarize(result)).toEqual({
      counts: { type: 2, operation: 14, skill: 1 },
      lossy: {},
      // `CollaborationOperation` (app-toolkit) declares `subject: Schema.Any`; markdown implements it.
      opaque: {
        'dxn:org.dxos.operation.appToolkit.acceptChange': ['subject'],
        'dxn:org.dxos.operation.appToolkit.rejectChange': ['subject'],
        'dxn:org.dxos.operation.appToolkit.restoreText': ['subject'],
      },
    });
  });
});
