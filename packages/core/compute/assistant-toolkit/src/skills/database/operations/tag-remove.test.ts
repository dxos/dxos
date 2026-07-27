//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EID, EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { TagAdd, TagRemove } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('TagRemove', () => {
  it.effect(
    'tag-remove: detaches the tag from the object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Tagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        yield* Database.flush();
        yield* Operation.invoke(TagAdd, { tag: Ref.make(tag), obj: Ref.make(organization) });
        expect(taggedIds(organization)).toContain(tag.id);

        yield* Operation.invoke(TagRemove, { tag: Ref.make(tag), obj: Ref.make(organization) });

        expect(taggedIds(organization)).not.toContain(tag.id);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Compare by entity id: a same-space ref stores a local EID (`echo:/<id>`) while `Obj.getURI`
// returns the fully-qualified form (`echo://<space>/<id>`).
const taggedIds = (obj: Obj.Any): (string | undefined)[] =>
  Obj.getMeta(obj).tags.map((ref) => EID.getEntityId(EID.parse(ref.uri)));
