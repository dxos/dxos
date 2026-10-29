//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as Team from '../team/index.ts';
import { REFERENCE } from '../util.ts';
import { EXTRACTED } from './contacts.ts';
import { Partial } from './partial.ts';
import { PIPELINE, STAGES } from './pipeline.ts';

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
  readonly 'spec'?: { readonly kind: string; readonly items?: Ref[]; readonly view?: Ref };
  readonly 'name'?: string;
  readonly 'parentMessage'?: string;
  readonly 'blocks'?: Array<{ readonly _tag: string; readonly text?: string; readonly disposition?: string }>;
  readonly 'organization'?: Ref;
  readonly 'arrangement'?: { readonly order: string[]; readonly columns: Record<string, { readonly ids: string[] }> };
  readonly '@meta'?: { readonly key?: string };
};

const DAY = 24 * 60 * 60 * 1000;
const dayOf = (iso: string) => Math.floor((Date.parse(iso) - Date.parse(REFERENCE.slice(0, 10))) / DAY);
const uri = (id: string) => `echo:///${id}`;

describe('Alien Labs inbox and CRM', () => {
  test('seeds mail, contacts and nine months of calendar', { timeout: 120_000 }, async ({ expect }) => {
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

    // 17 organizations (18 with team), 24 people (34 with team), 2 tables and the Sales pipeline Kanban.
    expect(Object.keys(result.orgs)).toHaveLength(17);
    expect(Object.keys(result.people)).toHaveLength(24);
    expect(countOf('type.organization:')).toBe(18);
    expect(countOf('type.person:')).toBe(34);
    expect(countOf('type.table:') + countOf('type.kanban:')).toBe(3);

    // Every type the archive holds is one the partials declare, or a core type every space holds
    // (space properties, persisted schemas, the text behind documents); no schema is persisted in the space.
    const declared = new Set([
      ...definition.schemas.map((schema) => Type.getTypename(schema)),
      'org.dxos.type.spaceProperties',
      'org.dxos.type.schema',
      'org.dxos.type.text',
    ]);
    const schemaObjects = ofType(archive.objects, 'type.schema:');
    expect(schemaObjects).toEqual([]);
    for (const type of Object.keys(counts)) {
      const typename = type.startsWith('echo:///')
        ? schemaObjects.find((object) => uri(object.id) === type)?.['@meta']?.key
        : type.replace(/^dxn:/, '').replace(/:[^:]+$/, '');
      expect(declared.has(typename ?? type), type).toBe(true);
    }

    const people = ofType(archive.objects, 'type.person:');
    const personByEmail = new Map(people.map((person) => [person.emails?.[0]?.value, person]));
    const extractedIds = new Set(EXTRACTED.map((key) => result.people[key].id));

    // 188 messages in 103 threads, oldest at -60d and newest on the reference date.
    const messages = ofType(feedEntries, 'type.message:').filter((message) => message.properties?.subject);
    expect(countOf('type.message:')).toBe(203);
    expect(messages).toHaveLength(188);
    expect(new Set(messages.map((message) => message.threadId)).size).toBe(103);
    const created = messages.map((message) => message.created!).sort();
    expect(dayOf(created[0])).toBe(-60);
    expect(dayOf(created[created.length - 1])).toBe(0);
    expect(created[created.length - 1] <= REFERENCE.replace('Z', '.000Z')).toBe(true);

    // The Sales pipeline: an items Kanban over the customer organizations by stage, at least 10.
    const kanban = ofType(archive.objects, 'type.kanban:').find((entry) => entry.id === result.pipeline.kanban.id);
    expect(kanban?.name).toBe('Sales pipeline');
    expect(kanban?.spec?.kind).toBe('items');
    expect(kanban?.arrangement?.order).toEqual(STAGES);
    const customers = STAGES.flatMap((stage) => PIPELINE[stage]);
    expect(customers.length).toBeGreaterThanOrEqual(10);
    for (const stage of STAGES) {
      expect(kanban?.arrangement?.columns[stage]?.ids).toEqual(PIPELINE[stage].map((key) => result.orgs[key].id));
    }

    // Every pipeline customer is a distinct organization with at least one email from someone who works there.
    expect(new Set(customers).size).toBe(customers.length);
    for (const key of customers) {
      const org = uri(result.orgs[key].id);
      const staff = ofType(archive.objects, 'type.person:')
        .filter((person) => person.organization?.['/'] === org)
        .map((person) => person.emails?.[0]?.value);
      expect(messages.filter((message) => staff.includes(message.sender?.email)).length, key).toBeGreaterThan(0);
    }

    // 171 events: 153 from -182d to the reference date, 18 in the three months after it.
    const events = ofType(feedEntries, 'type.event:');
    expect(countOf('type.event:')).toBe(171);
    // Notes on the one-offs, the team rituals and Hana's first 1:1s.
    expect(events.filter((event) => event.description)).toHaveLength(99);

    // The 10 most recent events before the reference time carry full meeting notes with a task list.
    const recentEvents = events
      .filter((event) => (event.startDate ?? '') <= REFERENCE.replace('Z', '.000Z'))
      .sort((left, right) => (right.startDate ?? '').localeCompare(left.startDate ?? ''))
      .slice(0, 10);
    expect(recentEvents).toHaveLength(10);
    for (const event of recentEvents) {
      const notes = event.description ?? '';
      expect(notes.split('\n').length, event.title).toBeGreaterThanOrEqual(25);
      expect(notes, event.title).toMatch(/^- \[ \] /m);
    }
    // Every past week has an event; nothing is scheduled past +90d, and the future is at most a quarter as dense.
    const eventDays = events.map((event) => dayOf(event.startDate!));
    for (let week = -182; week < 0; week += 7) {
      expect(eventDays.some((day) => day >= week && day < week + 7)).toBe(true);
    }
    expect(Math.max(...eventDays)).toBeLessThanOrEqual(90);
    const pastPerWeek = eventDays.filter((day) => day <= 0).length / (182 / 7);
    const futurePerWeek = eventDays.filter((day) => day > 0).length / (90 / 7);
    expect(futurePerWeek).toBeLessThanOrEqual(pastPerWeek / 4);

    // The Sales Review is on a weekday next week.
    const salesReview = events.find((event) => event.title === 'Sales Review');
    const salesReviewDay = dayOf(salesReview!.startDate!);
    expect(salesReviewDay).toBeGreaterThanOrEqual(5);
    expect(salesReviewDay).toBeLessThanOrEqual(11);
    expect([1, 2, 3, 4, 5]).toContain(new Date(salesReview!.startDate!).getUTCDay());

    // The 10 most recent messages each have a detailed summary in the annotations feed.
    const summaryOf = new Map(
      ofType(feedEntries, 'type.message:')
        .filter((entry) => entry.parentMessage && entry.blocks?.some((block) => block.disposition === 'summary'))
        .map((entry) => [entry.parentMessage, entry.blocks?.find((block) => block.disposition === 'summary')?.text]),
    );
    const recentMessages = [...messages]
      .sort((left, right) => (right.created ?? '').localeCompare(left.created ?? ''))
      .slice(0, 10);
    for (const message of recentMessages) {
      const summary = summaryOf.get(message.id) ?? '';
      expect(summary.length, message.properties?.subject).toBeGreaterThan(400);
      expect(summary, message.properties?.subject).toMatch(/^- /m);
      expect(summary, message.properties?.subject).toContain('**Suggested next actions**');
    }

    // Senders in the space link to their contact; automated senders link to none.
    for (const message of messages) {
      const person = personByEmail.get(message.sender?.email);
      expect(message.sender?.contact?.['/']).toBe(person ? uri(person.id) : undefined);
    }

    for (const event of events) {
      expect(event.attendees?.length ?? 0).toBeLessThanOrEqual(5);
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
    expect(withThread).toHaveLength(24);
    expect(withThread.filter((person) => !attending.has(person.emails![0].value))).toEqual([]);

    // Nadia's contact has an upcoming meeting to open: the Okapi follow-up.
    const nadia = result.people.nadia.emails![0].value;
    const upcoming = events.filter(
      (event) => dayOf(event.startDate!) > 0 && event.attendees?.some((attendee) => attendee.email === nadia),
    );
    expect(upcoming.map((event) => event.title)).toEqual(['Okapi alerting follow-up']);

    // The 7 extracted contacts look like extractions and the other 17 do not.
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
