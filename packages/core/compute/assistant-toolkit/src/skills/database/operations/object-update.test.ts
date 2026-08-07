//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { ObjectUpdate } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('ObjectUpdate', () => {
  it.effect(
    'object-update: writes the given properties onto the object',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Before' }));
        yield* Database.flush();

        yield* Operation.invoke(ObjectUpdate, {
          obj: Ref.make(organization),
          properties: { name: 'After', description: 'Now with a description.' },
        });

        expect(organization.name).toBe('After');
        expect(organization.description).toBe('Now with a description.');
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
