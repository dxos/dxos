//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { Database, Filter, Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import { artifactContents, seed, testLayer } from './testing';
import updateInvestorLog from './update-investor-log';

describe('update-investor-log', () => {
  it.effect('extracts contacts and writes one section per conversation', () =>
    Effect.gen(function* () {
      const { mailbox, project } = yield* seed([
        {
          email: 'lucia@backed.vc',
          name: 'Lucia Cerchlan',
          subject: 'Quarterly update',
          threadId: 'thread-q',
          body: 'Thanks for the update — numbers look strong.',
        },
        { email: 'lucia@backed.vc', subject: 'Re: Quarterly update', threadId: 'thread-q' },
        { email: 'martina@blueyard.com', name: 'Martina Bortot', subject: 'Portfolio reporting', threadId: 'thread-p' },
        { email: 'alice@example.com', subject: 'Not an investor' },
      ]);

      const result = yield* updateInvestorLog
        .handler({
          project: Ref.make(project),
          mailbox: Ref.make(mailbox),
          domains: ['backed.vc', 'blueyard.com'],
        })
        .pipe(Effect.provide(AiService.notAvailable));
      expect(result).toMatchObject({ scanned: 4, matched: 3, threads: 2, contacts: 2 });

      const people = yield* Database.query(Filter.type(Person.Person)).run;
      expect(people.map((person) => person.emails?.[0]?.value).sort()).toEqual([
        'lucia@backed.vc',
        'martina@blueyard.com',
      ]);
      expect((yield* Database.query(Filter.type(Organization.Organization)).run).length).toBe(2);

      const contents = yield* artifactContents(project, 'Investor Conversations');
      expect(contents).toHaveLength(1);
      expect(contents[0]).toContain('## Quarterly update');
      expect(contents[0]).toContain('## Portfolio reporting');
      expect(contents[0]).toContain('lucia@backed.vc');
      expect(contents[0]).not.toContain('Not an investor');
    }).pipe(Effect.provide(testLayer())),
  );
});
