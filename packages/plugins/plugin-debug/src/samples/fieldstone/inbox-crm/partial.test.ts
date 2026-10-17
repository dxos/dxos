//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as Team from '../team/index.ts';
import { REFERENCE } from '../util.ts';
import { EXTRACTED } from './contacts.ts';
import { Partial } from './partial.ts';

type Ref = { readonly '/': string };
type ActorJson = { readonly email?: string; readonly contact?: Ref };
type Entry = {
  readonly 'id': string;
  readonly '@type'?: string;
  readonly 'created'?: string;
  readonly 'sender'?: ActorJson;
  readonly 'threadId'?: string;
  readonly 'properties'?: { readonly subject?: string; readonly to?: string; readonly cc?: string };
  readonly 'attendees'?: ActorJson[];
  readonly 'startDate'?: string;
  readonly 'title'?: string;
  readonly 'description'?: string;
  readonly 'jobTitle'?: string;
  readonly 'department'?: string;
  readonly 'emails'?: Array<{ readonly label?: string; readonly value: string }>;
  readonly 'extracted'?: Record<string, string[]>;
  readonly 'spec'?: { readonly kind: string; readonly items?: Ref[] };
};

const DAY = 24 * 60 * 60 * 1000;
const dayOf = (iso: string) => Math.floor((Date.parse(iso) - Date.parse(REFERENCE.slice(0, 10))) / DAY);
const uri = (id: string) => `echo:///${id}`;

describe('Alien Labs inbox and CRM', () => {
  test('seeds mail, contacts and a year of calendar', { timeout: 120_000 }, async ({ expect }) => {
    const definition = SampleSpace.make({
      space: { name: 'Alien Labs inbox and CRM' },
      reference: REFERENCE,
      partials: { team: Team.Partial, inboxCrm: Partial },
      build: (partials) =>
        Effect.gen(function* () {
          const team = yield* partials.team();
          return yield* partials.inboxCrm({ team });
        }),
    });
    const { result, json } = await EffectEx.runPromise(buildArchive(definition));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);
    const archive: { objects: Entry[]; feeds: Array<{ messages: Entry[] }> } = JSON.parse(json);
    const ofType = (entries: Entry[], typename: string) =>
      entries.filter((entry) => entry['@type']?.includes(typename));
    const feedEntries = archive.feeds.flatMap((feed) => feed.messages);

    // 9 organizations (10 with team), 15 people (25 with team), 4 views.
    expect(Object.keys(result.orgs)).toHaveLength(9);
    expect(Object.keys(result.people)).toHaveLength(15);
    expect(countOf('type.organization:')).toBe(10);
    expect(countOf('type.person:')).toBe(25);
    expect(countOf('type.table:') + countOf('type.kanban:')).toBe(4);

    const people = ofType(archive.objects, 'type.person:');
    const personByEmail = new Map(people.map((person) => [person.emails?.[0]?.value, person]));
    const extractedIds = new Set(EXTRACTED.map((key) => result.people[key].id));

    // The Person Kanban holds everyone but the 5 extracted contacts.
    const board = ofType(archive.objects, 'type.kanban:').find((kanban) => kanban.spec?.kind === 'items');
    const onBoard = (board?.spec?.items ?? []).map((ref) => ref['/']);
    expect(onBoard).toHaveLength(20);
    expect(onBoard.some((ref) => [...extractedIds].some((id) => ref === uri(id)))).toBe(false);

    // 150 messages in 90 threads, oldest at −60d and newest on the reference date.
    const messages = ofType(feedEntries, 'type.message:').filter((message) => message.properties?.subject);
    expect(countOf('type.message:')).toBe(155);
    expect(messages).toHaveLength(150);
    expect(new Set(messages.map((message) => message.threadId)).size).toBe(90);
    const created = messages.map((message) => message.created!).sort();
    expect(dayOf(created[0])).toBe(-60);
    expect(dayOf(created[created.length - 1])).toBe(0);
    expect(created[created.length - 1] <= REFERENCE.replace('Z', '.000Z')).toBe(true);

    // 300 events, at least one in every week from −182d to +182d.
    const events = ofType(feedEntries, 'type.event:');
    expect(countOf('type.event:')).toBe(300);
    // Half carry notes: the one-offs, the team rituals and Hana's first 1:1s.
    expect(events.filter((event) => event.description)).toHaveLength(150);
    const eventDays = events.map((event) => dayOf(event.startDate!));
    for (let week = -182; week < 182; week += 7) {
      expect(eventDays.some((day) => day >= week && day < week + 7)).toBe(true);
    }

    // Senders in the space link to their contact; automated senders link to none.
    for (const message of messages) {
      const person = personByEmail.get(message.sender?.email);
      expect(message.sender?.contact?.['/']).toBe(person ? uri(person.id) : undefined);
    }

    // Every attendee in the space links to their contact.
    for (const attendee of events.flatMap((event) => event.attendees ?? [])) {
      const person = personByEmail.get(attendee.email);
      expect(person).toBeDefined();
      expect(attendee.contact?.['/']).toBe(uri(person!.id));
    }

    // Every external contact with a thread attends at least one event.
    const correspondents = messages
      .flatMap((message) => [message.sender?.email, message.properties?.to, message.properties?.cc])
      .join(' ');
    const attending = new Set(events.flatMap((event) => event.attendees ?? []).map((attendee) => attendee.email));
    const withThread = Object.values(result.people).filter((person) =>
      correspondents.includes(person.emails![0].value),
    );
    expect(withThread).toHaveLength(15);
    expect(withThread.filter((person) => !attending.has(person.emails![0].value))).toEqual([]);

    // Nadia's contact has an upcoming meeting to open: the Okapi follow-up.
    const nadia = result.people.nadia.emails![0].value;
    const upcoming = events.filter(
      (event) => dayOf(event.startDate!) > 0 && event.attendees?.some((attendee) => attendee.email === nadia),
    );
    expect(upcoming.map((event) => event.title)).toEqual(['Okapi alerting follow-up']);

    // The 5 extracted contacts look like extractions and the other 10 do not.
    const [mailbox] = ofType(archive.objects, 'type.mailbox:');
    const extraction = Object.entries(mailbox.extracted ?? {});
    expect(new Set(extraction.flatMap(([, ids]) => ids))).toEqual(extractedIds);
    for (const [messageId, [personId]] of extraction) {
      const message = messages.find((message) => message.id === messageId);
      expect(personByEmail.get(message?.sender?.email)?.id).toBe(personId);
    }
    for (const person of Object.values(result.people)) {
      const entry = people.find((candidate) => candidate.id === person.id)!;
      const looksExtracted = !entry.jobTitle && !entry.department && entry.emails?.[0]?.label === undefined;
      expect(looksExtracted).toBe(extractedIds.has(person.id));
    }
  });
});
