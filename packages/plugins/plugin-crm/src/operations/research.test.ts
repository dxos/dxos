//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Text } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

import { CrmOperation, ProfileOf } from '../types';
import { CrmOperationHandlerSet } from './index';

const TestLayer = AssistantTestLayer({
  operationHandlers: CrmOperationHandlerSet,
  types: [Person.Person, Organization.Organization, Markdown.Document, Text.Text, ProfileOf.ProfileOf],
  disableLlmMemoization: true,
});

describe('Research operations', () => {
  it.effect(
    'ResearchPerson scaffolds a profile document linked via ProfileOf',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const organization = db.add(
          Obj.make(Organization.Organization, {
            name: 'Ventura Advisors',
            website: 'https://ventura-advisors.example',
          }),
        );
        const person = db.add(
          Obj.make(Person.Person, {
            fullName: 'Priya Adebayo',
            jobTitle: 'Partner',
            emails: [{ value: 'padebayo@ventura-advisors.example' }],
            organization: Ref.make(organization),
          }),
        );
        yield* Effect.promise(() => db.flush());

        const { profile, created } = yield* Operation.invoke(CrmOperation.ResearchPerson, {
          subject: Ref.make(person),
        });
        expect(created).toBe(true);

        const document = yield* Database.load(profile);
        expect(document.name).toBe('Priya Adebayo');
        expect(Obj.getParent(document)?.id).toBe(person.id);
        const text = yield* Database.load(document.content);
        expect(text.content).toContain('## Overview');
        expect(text.content).toContain('Priya Adebayo — Partner at Ventura Advisors.');
        expect(text.content).toContain('- Email: padebayo@ventura-advisors.example');
        expect(text.content).toContain('Ventura Advisors (https://ventura-advisors.example)');
        expect(text.content).toContain('## Sources');

        const relations = yield* Database.query(Filter.type(ProfileOf.ProfileOf)).run;
        const relation = relations.find((candidate) => Relation.getTarget(candidate)?.id === person.id);
        expect(relation).toBeDefined();
        expect(relation && Relation.getSource(relation)?.id).toBe(document.id);
        expect(relation?.lastResearchedAt).toBeDefined();
        expect(relation?.summary).toBe('Priya Adebayo — Partner at Ventura Advisors.');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'ResearchPerson is idempotent: a re-run refreshes the relation without a second document',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const person = db.add(Obj.make(Person.Person, { fullName: 'Riley Nakamura' }));
        yield* Effect.promise(() => db.flush());

        const first = yield* Operation.invoke(CrmOperation.ResearchPerson, { subject: Ref.make(person) });
        const second = yield* Operation.invoke(CrmOperation.ResearchPerson, { subject: Ref.make(person) });
        expect(first.created).toBe(true);
        expect(second.created).toBe(false);
        expect(second.profile.uri.toString()).toBe(first.profile.uri.toString());

        const relations = yield* Database.query(Filter.type(ProfileOf.ProfileOf)).run;
        expect(relations.filter((candidate) => Relation.getTarget(candidate)?.id === person.id)).toHaveLength(1);
        const documents = yield* Database.query(Filter.type(Markdown.Document)).run;
        expect(documents).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'ResearchOrganization scaffolds a profile listing known people',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const organization = db.add(
          Obj.make(Organization.Organization, {
            name: 'Silverline Partners',
            website: 'https://silverline-partners.example',
          }),
        );
        db.add(Obj.make(Person.Person, { fullName: 'Saskia Volkov', organization: Ref.make(organization) }));
        db.add(Obj.make(Person.Person, { fullName: 'Francesco Bruno', organization: Ref.make(organization) }));
        db.add(Obj.make(Person.Person, { fullName: 'Unaffiliated Person' }));
        yield* Effect.promise(() => db.flush());

        const { profile, created } = yield* Operation.invoke(CrmOperation.ResearchOrganization, {
          subject: Ref.make(organization),
        });
        expect(created).toBe(true);

        const document = yield* Database.load(profile);
        expect(document.name).toBe('Silverline Partners');
        const text = yield* Database.load(document.content);
        expect(text.content).toContain('- Website: https://silverline-partners.example');
        expect(text.content).toContain('- Saskia Volkov');
        expect(text.content).toContain('- Francesco Bruno');
        expect(text.content).not.toContain('Unaffiliated Person');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
