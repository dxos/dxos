//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { buildArchive } from '@dxos/app-toolkit/testing';
import { Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { REFERENCE } from '../util.ts';
import { Partial } from './partial.ts';

describe('Fieldstone team', () => {
  test('seeds the company, its people and its agents', { timeout: 120_000 }, async ({ expect }) => {
    const definition = SampleSpace.make({
      space: { name: 'Fieldstone team' },
      reference: REFERENCE,
      partials: { team: Partial },
      build: (partials) => partials.team(),
    });
    const { result } = await EffectEx.runPromise(buildArchive(definition));

    expect(Object.keys(result.orgs)).toHaveLength(1);
    const people = Object.values(result.people);
    expect(people).toHaveLength(10);
    const fieldstone = Ref.make(result.orgs.fieldstone).uri.toString();
    expect(people.every((person) => person.organization?.uri.toString() === fieldstone)).toBe(true);
    const emails = people.map((person) => person.emails?.[0]?.value);
    expect(new Set(emails).size).toBe(10);

    const dids = Object.values(result.agents).map((agent) => agent.did);
    expect(dids).toHaveLength(4);
    expect(dids.every(Boolean)).toBe(true);
    expect(new Set(dids).size).toBe(4);
  });
});
