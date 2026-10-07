//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { CrmOperation } from '#types';

import { personProfileContent, upsertProfile } from './research.ts';

const handler: Operation.WithHandler<typeof CrmOperation.ResearchPerson> = CrmOperation.ResearchPerson.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject }) {
      const person = yield* Database.load(subject);
      const organization = person.organization ? yield* Database.load(person.organization) : undefined;
      return yield* upsertProfile(person, personProfileContent(person, organization));
    }),
  ),
);

export default handler;
