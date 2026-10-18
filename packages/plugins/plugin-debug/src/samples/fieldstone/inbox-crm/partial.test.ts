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
import { DEAL_TYPENAME, DEALS, STAGES } from './pipeline.ts';

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
  readonly 'organization'?: Ref;
  readonly 'stage'?: string;
  readonly 'arrangement'?: { readonly order: string[]; readonly columns: Record<string, { readonly ids: string[] }> };
  readonly '@meta'?: { readonly key?: string };
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

    // 14 organizations (15 with team), 21 people (31 with team), 5 views.
    expect(Object.keys(result.orgs)).toHaveLength(14);
    expect(Object.keys(result.people)).toHaveLength(21);
    expect(countOf('type.organization:')).toBe(15);
    expect(countOf('type.person:')).toBe(31);
    expect(countOf('type.table:') + countOf('type.kanban:')).toBe(5);

    // Every type the archive holds is one the partials declare, or a core type every space holds
    // (space properties, persisted schemas, the text behind documents); Deal's schema is persisted in the space.
    const declared = new Set([
      ...definition.schemas.map((schema) => Type.getTypename(schema)),
      'org.dxos.type.spaceProperties',
      'org.dxos.type.schema',
      'org.dxos.type.text',
    ]);
    const schemaObjects = ofType(archive.objects, 'type.schema:');
    expect(schemaObjects.map((object) => object['@meta']?.key)).toEqual([DEAL_TYPENAME]);
    for (const type of Object.keys(counts)) {
      const typename = type.startsWith('echo:///')
        ? schemaObjects.find((object) => uri(object.id) === type)?.['@meta']?.key
        : type.replace(/^dxn:/, '').replace(/:[^:]+$/, '');
      expect(declared.has(typename ?? type), type).toBe(true);
    }

    const people = ofType(archive.objects, 'type.person:');
    const personByEmail = new Map(people.map((person) => [person.emails?.[0]?.value, person]));
    const extractedIds = new Set(EXTRACTED.map((key) => result.people[key].id));

    // The Person Kanban holds everyone but the 7 extracted contacts.
    const board = ofType(archive.objects, 'type.kanban:').find((kanban) => kanban.spec?.kind === 'items');
    const onBoard = (board?.spec?.items ?? []).map((ref) => ref['/']);
    expect(onBoard).toHaveLength(24);
    expect(onBoard.some((ref) => [...extractedIds].some((id) => ref === uri(id)))).toBe(false);

    // 180 messages in 100 threads, oldest at −60d and newest on the reference date.
    const messages = ofType(feedEntries, 'type.message:').filter((message) => message.properties?.subject);
    expect(countOf('type.message:')).toBe(185);
    expect(messages).toHaveLength(180);
    expect(new Set(messages.map((message) => message.threadId)).size).toBe(100);
    const created = messages.map((message) => message.created!).sort();
    expect(dayOf(created[0])).toBe(-60);
    expect(dayOf(created[created.length - 1])).toBe(0);
    expect(created[created.length - 1] <= REFERENCE.replace('Z', '.000Z')).toBe(true);

    // The Sales pipeline: a view Kanban over Deals by stage, one deal per customer, at least 10.
    const kanban = ofType(archive.objects, 'type.kanban:').find((entry) => entry.id === result.pipeline.kanban.id);
    expect(kanban?.name).toBe('Sales pipeline');
    expect(kanban?.spec?.kind).toBe('view');
    expect(kanban?.arrangement?.order).toEqual(STAGES.map((stage) => stage.id));
    const deals = archive.objects.filter((entry) => entry.stage !== undefined);
    expect(deals.length).toBeGreaterThanOrEqual(10);
    expect(deals).toHaveLength(DEALS.length);
    for (const stage of STAGES) {
      const ids = deals.filter((deal) => deal.stage === stage.id).map((deal) => deal.id);
      expect(ids.length, stage.id).toBeGreaterThan(0);
      expect(kanban?.arrangement?.columns[stage.id]?.ids).toEqual(ids);
    }

    // Every pipeline customer is a distinct organization with at least one email from someone who works there.
    const customers = new Set(deals.map((deal) => deal.organization?.['/']));
    expect(customers.size).toBe(deals.length);
    for (const { key } of DEALS) {
      const org = uri(result.orgs[key].id);
      expect(customers.has(org), key).toBe(true);
      const staff = ofType(archive.objects, 'type.person:')
        .filter((person) => person.organization?.['/'] === org)
        .map((person) => person.emails?.[0]?.value);
      expect(messages.filter((message) => staff.includes(message.sender?.email)).length, key).toBeGreaterThan(0);
    }

    // 310 events, at least one in every week from −182d to +182d.
    const events = ofType(feedEntries, 'type.event:');
    expect(countOf('type.event:')).toBe(310);
    // Notes on the one-offs, the team rituals and Hana's first 1:1s.
    expect(events.filter((event) => event.description)).toHaveLength(160);
    const eventDays = events.map((event) => dayOf(event.startDate!));
    for (let week = -182; week < 182; week += 7) {
      expect(eventDays.some((day) => day >= week && day < week + 7)).toBe(true);
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
    expect(withThread).toHaveLength(21);
    expect(withThread.filter((person) => !attending.has(person.emails![0].value))).toEqual([]);

    // Nadia's contact has an upcoming meeting to open: the Okapi follow-up.
    const nadia = result.people.nadia.emails![0].value;
    const upcoming = events.filter(
      (event) => dayOf(event.startDate!) > 0 && event.attendees?.some((attendee) => attendee.email === nadia),
    );
    expect(upcoming.map((event) => event.title)).toEqual(['Okapi alerting follow-up']);

    // The 7 extracted contacts look like extractions and the other 14 do not.
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
