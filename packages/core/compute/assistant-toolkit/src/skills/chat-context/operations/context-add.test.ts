//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EID, EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { OperationTestLayer } from '../../../testing/index.ts';
import { ContextAdd } from './definitions.ts';

EntityId.dangerouslyDisableRandomness();

describe('ContextAdd', () => {
  it.effect(
    'context-add: binds the object to the conversation',
    Effect.fnUntraced(
      function* (_) {
        const feed = yield* Database.add(Feed.make());
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Context Corp' }));
        yield* Database.flush();

        yield* Operation.invoke(ContextAdd, { obj: Ref.make(organization) }).pipe(
          Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })),
        );

        const bindings = yield* Feed.query(feed, Query.type(AiContext.Binding)).run;
        const added = bindings.flatMap((binding) => entityIds(binding.objects.added));
        expect(added).toContain(organization.id);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Compare by entity id: a same-space ref stores a local EID (`echo:/<id>`) while `Obj.getURI`
// returns the fully-qualified form (`echo://<space>/<id>`).
const entityIds = (refs: readonly Ref.Ref<Obj.Unknown>[]): (string | undefined)[] =>
  refs.map((ref) => EID.getEntityId(EID.parse(ref.uri)));
