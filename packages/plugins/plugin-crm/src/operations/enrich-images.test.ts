//
// Copyright 2026 DXOS.org
//

import { describe, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { Organization, Person } from '@dxos/types';

import { CrmOperationHandlerSet } from '#operations';
import { CrmOperation } from '#types';

import { gravatarUrl, organizationImageCandidates, personImageCandidates } from './image-candidates.ts';

const TestLayer = AssistantTestLayer({
  operationHandlers: CrmOperationHandlerSet,
  types: [Organization.Organization, Person.Person],
  disableLlmMemoization: true,
});

describe('image candidates', () => {
  test('gravatarUrl hashes the normalized email (SHA-256) with 404 fallback', async () => {
    // SHA-256 of 'alice@example.com'.
    const url = await EffectEx.runPromise(gravatarUrl('  Alice@Example.com '));
    expect(url).toBe(
      'https://gravatar.com/avatar/ff8d9819fc0e12bf0d24892e45987e249a28dce836a85cad60e28eaaa8c6d976?s=256&d=404',
    );
  });

  test('personImageCandidates derives from the first email, empty without one', async () => {
    const person = Obj.make(Person.Person, { emails: [{ value: 'alice@example.com' }] });
    expect(await EffectEx.runPromise(personImageCandidates(person))).toHaveLength(1);
    expect(await EffectEx.runPromise(personImageCandidates(Obj.make(Person.Person, {})))).toEqual([]);
  });

  test('organizationImageCandidates derives logo + favicon from the website domain', () => {
    const organization = Obj.make(Organization.Organization, { name: 'Initech', website: 'https://www.initech.com' });
    expect(organizationImageCandidates(organization)).toEqual([
      'https://logo.clearbit.com/initech.com',
      'https://www.google.com/s2/favicons?domain=initech.com&sz=128',
    ]);
    expect(organizationImageCandidates(Obj.make(Organization.Organization, {}))).toEqual([]);
  });
});

describe('EnrichImages operation (no-candidate paths, offline)', () => {
  it.effect(
    'skips subjects with no derivable candidates and never touches subjects with an image',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        // No email → no candidates → skipped.
        const nobody = db.add(Obj.make(Person.Person, { fullName: 'No Email' }));
        // No website → no candidates → skipped.
        db.add(Obj.make(Organization.Organization, { name: 'Stealth Startup' }));
        // Already has an image → excluded from the scan entirely.
        db.add(Obj.make(Person.Person, { emails: [{ value: 'has@image.com' }], image: 'https://img.example/x.png' }));
        yield* Effect.promise(() => db.flush());

        const result = yield* Operation.invoke(CrmOperation.EnrichImages, {});
        expect(result.scanned).toBe(2);
        expect(result.updated).toBe(0);
        expect(result.skipped).toBe(2);
        expect(nobody.image).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
