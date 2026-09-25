//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Ref } from '@dxos/echo';
import { Person } from '@dxos/types';

import { CrmOperation } from '#types';

import { organizationProfileContent, upsertProfile } from './research.ts';

const handler: Operation.WithHandler<typeof CrmOperation.ResearchOrganization> = CrmOperation.ResearchOrganization.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject }) {
      const organization = yield* Database.load(subject);
      const organizationUri = Ref.make(organization).uri;
      const persons = yield* Database.query(Filter.type(Person.Person)).run;
      const people = persons.filter((person) => person.organization?.uri === organizationUri);
      return yield* upsertProfile(organization, organizationProfileContent(organization, people));
    }),
  ),
);

export default handler;
