//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EID, EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import { TagAdd } from './definitions';
import { DatabaseHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DatabaseHandlers,
  types: [
    Organization.Organization,
    Person.Person,
    Employer.Employer,
    Tag.Tag,
    Skill.Skill,
    Feed.Feed,
    AiContext.Binding,
  ],
  skills: [DatabaseSkill.make()],
  disableLlmMemoization: true,
});

describe('TagAdd', () => {
  it.effect(
    'tag-add: attaches the tag to the object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Tagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        yield* Database.flush();

        yield* Operation.invoke(TagAdd, { tag: Ref.make(tag), obj: Ref.make(organization) });

        expect(taggedIds(organization)).toContain(tag.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Compare by entity id: a same-space ref stores a local EID (`echo:/<id>`) while `Obj.getURI`
// returns the fully-qualified form (`echo://<space>/<id>`).
const taggedIds = (obj: Obj.Any): (string | undefined)[] =>
  Obj.getMeta(obj).tags.map((ref) => EID.getEntityId(EID.parse(ref.uri)));
