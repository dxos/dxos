//
// Copyright 2026 DXOS.org
//

/**
 * Builds the Bramble Coffee Roasters exemplar space and writes its JSON snapshot to disk.
 *
 * The snapshot is committed at:
 *   packages/apps/composer-app/src/plugins/welcome/content/exemplar-space.dx.json
 *
 * The runtime welcome capability imports it on first launch so every new identity gets a
 * fully populated themed sample space without the script ever running in the browser.
 *
 * Run via the moon task: `moon run composer-app:build-exemplar`.
 *
 * Content is grounded in `about-bramble.md` in the same content/ directory — that document is
 * the canonical reference for all Bramble world-facts (company history, team, suppliers, customers,
 * active initiatives, email conventions, map coordinates). When extending or regenerating the
 * fixture, read it first and update it if the world changes. All generated content must agree
 * with the facts and tone described there.
 */

import { Store } from '@tldraw/store';
import {
  DocumentRecordType,
  PageRecordType,
  TLDOCUMENT_ID,
  createTLSchema,
  geoShapeMigrations,
  geoShapeProps,
  type TLRecord,
} from '@tldraw/tlschema';
import { type IndexKey } from '@tldraw/utils';
import * as S from 'effect/Schema';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import {
  Annotation,
  Collection,
  DXN,
  EID,
  Feed,
  Filter,
  JsonSchema,
  Obj,
  Query,
  Ref,
  Type,
  View,
} from '@dxos/echo';
import { Format, FormatAnnotation, LabelAnnotation, PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { Calendar, Mailbox } from '@dxos/plugin-inbox';
import { Kanban } from '@dxos/plugin-kanban';
import { Map as MapView } from '@dxos/plugin-map';
import { Markdown } from '@dxos/plugin-markdown';
import { Masonry } from '@dxos/plugin-masonry';
import { Sheet } from '@dxos/plugin-sheet';
import { Sketch } from '@dxos/plugin-sketch';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';
import { Actor, ContentBlock, Event, Message, Organization, Person, Project, Task } from '@dxos/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_PATH = resolve(__dirname, '../src/plugins/welcome/content/exemplar-space.dx.json');
const ABOUT_MD_PATH = resolve(__dirname, '../src/plugins/welcome/content/about-bramble.md');
const WELCOME_MD_PATH = resolve(__dirname, '../src/plugins/welcome/content/welcome.md');

// -----------------------------------------------------------------------------
// RoastLog — exemplar-specific schema defined entirely in this build script.
//
// This is intentionally NOT a registered plugin type — it demonstrates that
// users can define custom ECHO schemas for their own domain objects. The typename
// uses a Bramble-specific namespace to show schemas don't need to live in @dxos.
//
// The jsonSchema is baked into each View.View so Table/Kanban can render these
// objects at runtime without the schema being registered in the app.
// -----------------------------------------------------------------------------
const RoastLog = S.Struct({
  title: S.String.pipe(S.annotations({ title: 'Batch' })),
  date: S.optional(S.String.pipe(S.annotations({ title: 'Date' }))),
  origin: S.optional(S.String.pipe(S.annotations({ title: 'Origin / Lot' }))),
  machine: S.optional(S.String.pipe(S.annotations({ title: 'Machine' }))),
  roaster: S.optional(Ref.Ref(Person.Person).annotations({ title: 'Roaster' })),
  greenWeightKg: S.optional(S.Number.pipe(S.annotations({ title: 'Green (kg)' }))),
  roastWeightKg: S.optional(S.Number.pipe(S.annotations({ title: 'Roast (kg)' }))),
  chargeTemp: S.optional(S.Number.pipe(S.annotations({ title: 'Charge (°C)' }))),
  firstCrackTime: S.optional(S.String.pipe(S.annotations({ title: 'First Crack' }))),
  developmentTime: S.optional(S.String.pipe(S.annotations({ title: 'Dev Time' }))),
  dropTemp: S.optional(S.Number.pipe(S.annotations({ title: 'Drop (°C)' }))),
  roastLevel: S.optional(S.String.pipe(S.annotations({ title: 'Roast Level' }))),
  status: S.Literal('planned', 'roasted', 'cupped', 'approved').pipe(
    FormatAnnotation.set(Format.TypeFormat.SingleSelect),
    S.annotations({
      title: 'Status',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: [
            { id: 'planned', title: 'Planned', color: 'indigo' },
            { id: 'roasted', title: 'Roasted', color: 'orange' },
            { id: 'cupped', title: 'Cupped', color: 'purple' },
            { id: 'approved', title: 'Approved', color: 'green' },
          ],
        },
      },
    }),
  ),
  notes: S.optional(S.String.pipe(S.annotations({ title: 'Notes' }))),
}).pipe(
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({ icon: 'ph--fire-simple--regular', hue: 'amber' }),
  Type.makeObject(DXN.make('example.type.roastLog', '0.1.0')),
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RoastLog = Type.InstanceType<typeof RoastLog>;
const makeRoastLog = (props: Obj.MakeProps<typeof RoastLog>): RoastLog => Obj.make(RoastLog, props);

// All ECHO types we add to the space. Must be registered on any client that hydrates the snapshot.
const SCHEMAS: Type.AnyEntity[] = [
  Collection.Collection,
  Feed.Feed,
  Markdown.Document,
  Person.Person,
  Organization.Organization,
  Message.Message,
  Event.Event,
  Project.Project,
  Task.Task,
  Mailbox.Mailbox,
  Calendar.Calendar,
  Sketch.Sketch,
  Sketch.Canvas,
  Sheet.Sheet,
  Table.Table,
  Kanban.Kanban,
  MapView.Map,
  Masonry.Masonry,
  View.View,
  RoastLog,
];

// Stable reference date so regenerations are reproducible. Override with NOW=2026-05-20 env.
const NOW = process.env.NOW ? new Date(process.env.NOW) : new Date('2026-05-20T15:00:00Z');

const daysAgo = (days: number, hours = 9): string => {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hours, 0, 0, 0);
  return date.toISOString();
};

const daysFromNow = (days: number, hours = 9): string => daysAgo(-days, hours);

const textBlock = (text: string): ContentBlock.Text => ({ _tag: 'text', text }) satisfies ContentBlock.Text;

const actor = (name: string, email: string): Actor.Actor => ({ role: 'user', name, email });

// -----------------------------------------------------------------------------
// Entry point — gated on BUILD_EXEMPLAR so it doesn't run during normal CI.
// -----------------------------------------------------------------------------

describe.skipIf(!process.env.BUILD_EXEMPLAR)('build-exemplar-space', () => {
  test('generate Bramble Coffee Roasters exemplar snapshot', { timeout: 60_000 }, async () => {
    const aboutMd = await readFile(ABOUT_MD_PATH, 'utf8');
    const welcomeMd = await readFile(WELCOME_MD_PATH, 'utf8');

    console.log('booting client…');
    const testBuilder = new TestBuilder();
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    try {
      await client.halo.createIdentity({ displayName: 'Bramble exemplar builder' });
      await client.addTypes(SCHEMAS);

      console.log('creating space…');
      const space = await client.spaces.create({ name: 'Bramble Coffee Roasters', icon: 'potted-plant', hue: 'amber' });
      await space.waitUntilReady();

      await populateSpace(space, { aboutMd, welcomeMd });

      console.log('flushing…');
      await space.db.flush();

      console.log('exporting…');
      const archive = await space.internal.export({ format: SpaceArchive.Format.JSON });

      // Store as a single line so regenerations produce a 1-line diff rather than
      // thousands of changed lines. The file is valid JSON; use `jq .` to inspect it.
      const parsed = JSON.parse(new TextDecoder().decode(archive.contents));
      const minified = JSON.stringify(parsed);
      await writeFile(OUTPUT_PATH, minified + '\n', 'utf8');
      console.log(`wrote ${OUTPUT_PATH} (${minified.length} bytes, ${parsed.objects.length} objects)`);
    } finally {
      await client.destroy();
    }
  });
});

// -----------------------------------------------------------------------------
// Space population
// -----------------------------------------------------------------------------

const populateSpace = async (space: Space, content: { aboutMd: string; welcomeMd: string }) => {
  // Initialize the root collection on space.properties (normally done by plugin-space's
  // identity-created capability — we replicate it here for the headless builder).
  const collectionTypename = Type.getTypename(Collection.Collection);
  Obj.update(space.properties, (properties) => {
    if (!properties[collectionTypename]) {
      properties[collectionTypename] = Ref.make(Collection.make());
    }
  });
  const rootCollection = space.properties[collectionTypename]?.target as Collection.Collection | undefined;
  if (!rootCollection) {
    throw new Error('Failed to initialize root collection on space.properties');
  }

  // Top-level docs ---------------------------------------------------------
  const welcomeDoc = Markdown.make({ name: 'Welcome & Tour', content: content.welcomeMd });
  space.db.add(welcomeDoc);
  const aboutDoc = Markdown.make({ name: 'About Bramble Coffee Roasters', content: content.aboutMd });
  space.db.add(aboutDoc);

  // Contacts — orgs, people, and views live directly in the space DB.
  // They don't need their own collection; the database viewer surfaces them.
  const { organizations } = addOrganizations(space);
  const { people } = addPeople(space, organizations);
  addOrganizationViews(space);

  // Inbox ------------------------------------------------------------------
  const { mailbox, messages } = makeMailbox(people);
  space.db.add(mailbox);

  // Calendar ---------------------------------------------------------------
  const { calendar, events } = makeCalendar(people, organizations);
  space.db.add(calendar);

  // Spring Blend Launch project --------------------------------------------
  const { project, tasks } = makeProject(people);
  space.db.add(project);
  tasks.forEach((task) => space.db.add(task));
  const projectCollection = makeCollection(space, 'Spring Blend Launch', [
    Ref.make(project),
    ...tasks.map((task) => Ref.make(task)),
  ]);

  // Notes & Documents — notes reference people/orgs/project via DXN links/embeds.
  const notes = makeNotes(people, organizations, project);
  notes.forEach((note) => space.db.add(note));
  const sketches = makeSketches();
  sketches.forEach((sketch) => space.db.add(sketch));
  const sheets = makeSheets();
  sheets.forEach((sheet) => space.db.add(sheet));

  const notesCollection = makeCollection(space, 'Notes & Documents', [
    ...notes.map((n) => Ref.make(n)),
    ...sketches.map((s) => Ref.make(s)),
    ...sheets.map((s) => Ref.make(s)),
  ]);

  // Roast Log — custom schema entries with Table + Kanban views.
  const roastLogCollection = await addRoastLogCollection(space, people);

  // Wire up the root collection in a stable order.
  Obj.update(rootCollection, (rootCollection) => {
    rootCollection.objects.push(Ref.make(welcomeDoc));
    rootCollection.objects.push(Ref.make(aboutDoc));
    rootCollection.objects.push(Ref.make(mailbox));
    rootCollection.objects.push(Ref.make(calendar));
    rootCollection.objects.push(Ref.make(projectCollection));
    rootCollection.objects.push(Ref.make(notesCollection));
    rootCollection.objects.push(Ref.make(roastLogCollection));
  });

  // Append feed messages AFTER db.flush so the feed objects have DXNs.
  await space.db.flush();
  await appendToFeed(space, mailbox.feed.target!, messages);
  await appendToFeed(space, calendar.feed.target!, events);
};

const makeCollection = (space: Space, name: string, objects: Ref.Ref<Obj.Unknown>[]): Collection.Collection =>
  space.db.add(Obj.make(Collection.Collection, { name, objects }));

const appendToFeed = async (space: Space, feed: Feed.Feed, items: Obj.Unknown[]) => {
  const dxn = Feed.getQueueUri(feed);
  if (!dxn) {
    throw new Error('Feed has no DXN — has the space been flushed?');
  }
  const queue = space.queues.get(dxn);
  await queue.append(items as any);
};

// -----------------------------------------------------------------------------
// Organizations
// -----------------------------------------------------------------------------

type OrganizationsBundle = {
  organizations: Record<OrgKey, Organization.Organization>;
};

type OrgKey = 'bramble' | 'fincaEsperanza' | 'sidamoCoop' | 'northStar' | 'hatch' | 'oliveAndVine';

const ORG_SEEDS: Array<{
  key: OrgKey;
  name: string;
  description: string;
  status: 'active' | 'qualified' | 'prospect' | 'commit';
  website: string;
  location: [number, number]; // [lng, lat]
}> = [
  {
    key: 'bramble',
    name: 'Bramble Coffee Roasters',
    description: 'Our roastery and cafe in Oakland, CA.',
    status: 'active',
    website: 'https://bramblecoffee.com',
    location: [-122.2711, 37.8044],
  },
  {
    key: 'fincaEsperanza',
    name: 'Finca Esperanza',
    description: 'Family farm in Huila, Colombia. Carmen Restrepo. Washed caturra and pink bourbon.',
    status: 'active',
    website: 'https://fincaesperanza.co',
    location: [-75.5277, 2.5359],
  },
  {
    key: 'sidamoCoop',
    name: 'Sidamo Cooperative',
    description: 'Cooperative in Sidamo, Ethiopia. Naturals. Contact: Abel Tadesse.',
    status: 'active',
    website: 'https://sidamocoop.org',
    location: [38.4955, 6.7665],
  },
  {
    key: 'northStar',
    name: 'North Star Café',
    description: 'Wholesale customer in Portland, OR. Linden + rotating single-origin.',
    status: 'active',
    website: 'https://northstarcafe.com',
    location: [-122.6765, 45.5231],
  },
  {
    key: 'hatch',
    name: 'Hatch Bakery',
    description: 'Wholesale customer in Brooklyn, NY. Linden + Field Notes. Piloting Spring Blend.',
    status: 'qualified',
    website: 'https://hatchbakery.com',
    location: [-73.9442, 40.6782],
  },
  {
    key: 'oliveAndVine',
    name: 'Olive & Vine',
    description: 'New wholesale lead in Austin, TX. Mateo Ruiz. First samples just went out.',
    status: 'prospect',
    website: 'https://oliveandvine.cafe',
    location: [-97.7431, 30.2672],
  },
];

const addOrganizations = (space: Space): OrganizationsBundle => {
  const organizations = {} as Record<OrgKey, Organization.Organization>;
  for (const seed of ORG_SEEDS) {
    const org = Organization.make({
      name: seed.name,
      description: seed.description,
      status: seed.status,
      website: seed.website,
      location: seed.location,
    });
    space.db.add(org);
    organizations[seed.key] = org;
  }
  return { organizations };
};

// -----------------------------------------------------------------------------
// People
// -----------------------------------------------------------------------------

type PeopleBundle = {
  people: Record<PersonKey, Person.Person>;
};

type PersonKey = 'kai' | 'diego' | 'sam' | 'riley' | 'carmen' | 'abel' | 'jordan' | 'priya' | 'mateo';

const PEOPLE_SEEDS: Array<{
  key: PersonKey;
  fullName: string;
  preferredName: string;
  jobTitle: string;
  orgKey: OrgKey;
  email: string;
}> = [
  {
    key: 'kai',
    fullName: 'Kai Chen',
    preferredName: 'Kai',
    jobTitle: 'Head Roaster (co-founder)',
    orgKey: 'bramble',
    email: 'kai@bramblecoffee.com',
  },
  {
    key: 'diego',
    fullName: 'Diego Alvarez',
    preferredName: 'Diego',
    jobTitle: 'Sourcing (co-founder)',
    orgKey: 'bramble',
    email: 'diego@bramblecoffee.com',
  },
  {
    key: 'sam',
    fullName: 'Sam Okafor',
    preferredName: 'Sam',
    jobTitle: 'Wholesale Lead',
    orgKey: 'bramble',
    email: 'sam@bramblecoffee.com',
  },
  {
    key: 'riley',
    fullName: 'Riley Tanaka',
    preferredName: 'Riley',
    jobTitle: 'Operations & Logistics',
    orgKey: 'bramble',
    email: 'riley@bramblecoffee.com',
  },
  {
    key: 'carmen',
    fullName: 'Carmen Restrepo',
    preferredName: 'Carmen',
    jobTitle: 'Producer',
    orgKey: 'fincaEsperanza',
    email: 'carmen@fincaesperanza.co',
  },
  {
    key: 'abel',
    fullName: 'Abel Tadesse',
    preferredName: 'Abel',
    jobTitle: 'Export Liaison',
    orgKey: 'sidamoCoop',
    email: 'abel@sidamocoop.org',
  },
  {
    key: 'jordan',
    fullName: 'Jordan Park',
    preferredName: 'Jordan',
    jobTitle: 'Owner / Buyer',
    orgKey: 'northStar',
    email: 'jordan@northstarcafe.com',
  },
  {
    key: 'priya',
    fullName: 'Priya Shah',
    preferredName: 'Priya',
    jobTitle: 'Coffee Program Lead',
    orgKey: 'hatch',
    email: 'priya@hatchbakery.com',
  },
  {
    key: 'mateo',
    fullName: 'Mateo Ruiz',
    preferredName: 'Mateo',
    jobTitle: 'Beverage Buyer',
    orgKey: 'oliveAndVine',
    email: 'mateo@oliveandvine.cafe',
  },
];

const addPeople = (space: Space, organizations: Record<OrgKey, Organization.Organization>): PeopleBundle => {
  const people = {} as Record<PersonKey, Person.Person>;
  for (const seed of PEOPLE_SEEDS) {
    const person = Person.make({
      fullName: seed.fullName,
      preferredName: seed.preferredName,
      jobTitle: seed.jobTitle,
      organization: Ref.make(organizations[seed.orgKey]),
      emails: [{ label: 'Work', value: seed.email }],
    });
    space.db.add(person);
    people[seed.key] = person;
  }
  return { people };
};

// -----------------------------------------------------------------------------
// Organization views (Table / Kanban / Map / Masonry)
// -----------------------------------------------------------------------------

const addOrganizationViews = (space: Space): void => {
  const jsonSchema = JsonSchema.toJsonSchema(Organization.Organization);
  const query = Query.select(Filter.typename(Type.getTypename(Organization.Organization)));

  // Each view object holds its own View.View so they can be customised independently
  // (e.g. Kanban's pivot field). We share the query/jsonSchema across them.
  // Views live directly in the space DB and are accessible via the database viewer —
  // they don't need their own collection.
  const makeView = (fields: string[], pivotFieldName?: string) =>
    space.db.add(ViewModel.make({ query, queryRaw: undefined, jsonSchema, fields, pivotFieldName }));

  const tableView = makeView(['name', 'status', 'website', 'description']);
  space.db.add(Table.make({ name: 'Table', view: tableView, jsonSchema }));

  const kanbanView = makeView(['name', 'status', 'description'], 'status');
  space.db.add(Kanban.make({ name: 'Kanban', view: kanbanView }));

  const mapView = makeView(['name', 'location', 'description']);
  space.db.add(MapView.make({ name: 'Map', view: mapView, center: [-100, 30], zoom: 2 }));

  const masonryView = makeView(['name', 'description', 'image']);
  space.db.add(Masonry.make({ name: 'Masonry', view: masonryView }));
};

// -----------------------------------------------------------------------------
// Mailbox
// -----------------------------------------------------------------------------

const makeMailbox = (
  people: Record<PersonKey, Person.Person>,
): { mailbox: Mailbox.Mailbox; messages: Message.Message[] } => {
  const mailbox = Mailbox.make({ name: 'Inbox' });

  // Build emails as a chronological list — oldest first. Numbers are days-ago.
  type Email = {
    from: PersonKey | 'noise';
    subject: string;
    body: string;
    daysAgo: number;
    senderOverride?: Actor.Actor;
  };
  const peopleSeedByKey = Object.fromEntries(PEOPLE_SEEDS.map((seed) => [seed.key, seed])) as Record<
    PersonKey,
    (typeof PEOPLE_SEEDS)[number]
  >;
  const senderFor = (key: PersonKey): Actor.Actor => {
    const seed = peopleSeedByKey[key];
    if (!seed) {
      throw new Error(`No PEOPLE_SEEDS entry for PersonKey "${key}". Add the person or use senderOverride.`);
    }
    return actor(seed.fullName, seed.email);
  };

  const emails: Email[] = [
    {
      from: 'carmen',
      daysAgo: 41,
      subject: 'Hola Diego — Q2 harvest update from Esperanza',
      body: 'Hola Diego, the cherries are coming in heavier than last year. Brix is good. I think we will have your full lot ready for shipment in 5–6 weeks. Will send photos next week. Saludos, Carmen',
    },
    {
      from: 'diego',
      daysAgo: 40,
      subject: 'Re: Hola Diego — Q2 harvest update from Esperanza',
      body: 'Carmen — that is great news. I will plan around a mid-June arrival. Let me know if you need anything from us before then. — Diego',
    },
    {
      from: 'abel',
      daysAgo: 38,
      subject: 'Sidamo: lots 42–44 cupping scores',
      body: 'Diego, attached are the cupping scores for lots 42–44 this season. Lot 42 is the standout — fruit-forward, jasmine, clean ferment. Pricing for the full container coming separately. — Abel',
    },
    {
      from: 'jordan',
      daysAgo: 35,
      subject: 'Reorder: 30 lb Linden + 10 lb Field Notes',
      body: 'Hey Sam, ready for another round. Same as last time: 30 lb Linden whole bean, 10 lb Field Notes. Friday delivery if possible. — Jordan',
    },
    {
      from: 'noise',
      daysAgo: 35,
      subject: 'Your Stripe payout — $4,218.91',
      senderOverride: actor('Stripe', 'no-reply@stripe.com'),
      body: 'Your weekly payout has been initiated. View details in the Stripe dashboard.',
    },
    {
      from: 'priya',
      daysAgo: 33,
      subject: 'Espresso blend pilot — interested',
      body: "Hi Kai — Hatch would love to be part of the Spring Blend pilot. We have an espresso bar that's ready for something new. What are next steps? — Priya",
    },
    {
      from: 'kai',
      daysAgo: 32,
      subject: 'Re: Espresso blend pilot — interested',
      body: 'Priya — yes! I will send a 2 lb sample with v1 of the blend next week. Would love your feedback. — Kai',
    },
    {
      from: 'carmen',
      daysAgo: 30,
      subject: 'Fotos del beneficio',
      body: 'Photos from the wet mill this week. The new patio is making a real difference for drying. Te mando un abrazo. — Carmen',
    },
    {
      from: 'diego',
      daysAgo: 28,
      subject: 'Trip planning — Colombia → Ethiopia',
      body: 'Kai, Sam — I am locking dates for the Q2 trip. Tentatively: 9 days in Huila, then 5 in Ethiopia. Will share the full itinerary by end of week. — Diego',
    },
    {
      from: 'noise',
      daysAgo: 27,
      subject: 'Coffee Expo NYC — registration open',
      senderOverride: actor('SCA Events', 'events@sca.coffee'),
      body: 'Specialty Coffee Expo NYC registration is now open. Early-bird pricing through next month.',
    },
    {
      from: 'kai',
      daysAgo: 26,
      subject: 'Roast curve memo — Spring Blend v1',
      body: 'Team — current draft is in the roast log. First crack at 9:18, drop at 11:30. We are tasting flat for the espresso shot — will pull up the development a touch on v2. — Kai',
    },
    {
      from: 'jordan',
      daysAgo: 24,
      subject: 'Question about the Sidamo single-origin',
      body: 'Hi Sam — any chance of getting a few pounds of the new Sidamo when it lands? Customers loved the last lot. — Jordan',
    },
    {
      from: 'sam',
      daysAgo: 23,
      subject: 'Re: Question about the Sidamo single-origin',
      body: 'Jordan — putting you down for 8 lb of lot 42 when it arrives. Should be ~3 weeks out. — Sam',
    },
    {
      from: 'mateo',
      daysAgo: 21,
      subject: 'Hello from Olive & Vine in Austin',
      body: 'Hi there — Olive & Vine is a small wine bar / coffee bar opening soon in East Austin. A friend at North Star recommended you. Could we talk wholesale? — Mateo',
    },
    {
      from: 'sam',
      daysAgo: 20,
      subject: 'Re: Hello from Olive & Vine in Austin',
      body: 'Mateo — we would love to. Sending a sampler with Linden, Field Notes, and a current single-origin tomorrow. Let me know what resonates. — Sam',
    },
    {
      from: 'priya',
      daysAgo: 17,
      subject: 'Cupping invite — Tuesday',
      body: 'Kai — we are doing a cupping at the bakery next Tuesday at 4. Could send the Spring Blend v1 ahead, or would you want to bring it in person? — Priya',
    },
    {
      from: 'noise',
      daysAgo: 15,
      subject: 'Shipment update: tracking #1Z999AA10123456789',
      senderOverride: actor('UPS', 'tracking@ups.com'),
      body: 'Your shipment is in transit. Expected delivery: tomorrow by 8pm.',
    },
    {
      from: 'riley',
      daysAgo: 12,
      subject: 'Packaging vendor switch — heads up',
      body: 'Team — we are moving label printing from Stack & Co. to Letterform Press starting next month. Better minimums and same lead times. — Riley',
    },
    {
      from: 'abel',
      daysAgo: 9,
      subject: 'Pricing — Sidamo container',
      body: 'Diego — pricing attached for the full container. Up ~6% from last year, in line with what we discussed. Confirm and I will start the export paperwork. — Abel',
    },
    {
      from: 'kai',
      daysAgo: 7,
      subject: 'Spring blend v2 — cupping notes',
      body: 'v2 cupping notes are in the document. Big improvement on body, the espresso shot is much more balanced. Heading toward v3 with a small ratio change. — Kai',
    },
    {
      from: 'jordan',
      daysAgo: 4,
      subject: 'Visiting Oakland — coffee?',
      body: 'Sam — I am in town next Wednesday. Want to grab a cupping at the roastery? — Jordan',
    },
    {
      from: 'priya',
      daysAgo: 2,
      subject: 'Spring blend v1 — feedback',
      body: 'Kai — the team loved the chocolate and red fruit notes. Wholesale customers asked about the espresso roast specifically. Would order standing 20 lb/wk starting at launch. — Priya',
    },
  ];

  const messages: Message.Message[] = emails.map((email) => {
    const sender = email.senderOverride ?? senderFor(email.from as PersonKey); // 'noise' emails always carry senderOverride
    return Message.make({
      created: daysAgo(email.daysAgo, 10),
      sender,
      blocks: [textBlock(email.body)],
      properties: { subject: email.subject },
    });
  });

  return { mailbox, messages };
};

// -----------------------------------------------------------------------------
// Calendar
// -----------------------------------------------------------------------------

const makeCalendar = (
  people: Record<PersonKey, Person.Person>,
  organizations: Record<OrgKey, Organization.Organization>,
): { calendar: Calendar.Calendar; events: Event.Event[] } => {
  const calendar = Calendar.make({ name: 'Bramble Calendar' });

  const seedForPerson = (key: PersonKey) => PEOPLE_SEEDS.find((s) => s.key === key)!;
  const a = (key: PersonKey): Actor.Actor => actor(seedForPerson(key).fullName, seedForPerson(key).email);
  const owner = a('kai');

  const eventAt = (props: {
    title: string;
    description?: string;
    daysFromNowVal: number;
    startHour: number;
    durationHours: number;
    attendees: Actor.Actor[];
  }): Event.Event =>
    Event.make({
      title: props.title,
      description: props.description,
      owner,
      attendees: props.attendees,
      startDate: daysFromNow(props.daysFromNowVal, props.startHour),
      endDate: daysFromNow(props.daysFromNowVal, props.startHour + props.durationHours),
    });

  const events: Event.Event[] = [
    eventAt({
      title: 'Roastery standup',
      description: 'Weekly team sync at the roastery.',
      daysFromNowVal: -12,
      startHour: 16,
      durationHours: 1,
      attendees: [a('kai'), a('diego'), a('sam'), a('riley')],
    }),
    eventAt({
      title: 'Tasting w/ Jordan (North Star)',
      description: 'Cupping the new Sidamo + Spring Blend v1 with North Star.',
      daysFromNowVal: -8,
      startHour: 17,
      durationHours: 1,
      attendees: [a('kai'), a('sam'), a('jordan')],
    }),
    eventAt({
      title: 'Roastery standup',
      daysFromNowVal: -5,
      startHour: 16,
      durationHours: 1,
      attendees: [a('kai'), a('diego'), a('sam'), a('riley')],
    }),
    eventAt({
      title: 'Q2 planning',
      description: 'Plan Q2: Spring Blend launch, sourcing trip, hiring.',
      daysFromNowVal: -3,
      startHour: 15,
      durationHours: 2,
      attendees: [a('kai'), a('diego'), a('sam'), a('riley')],
    }),
    eventAt({
      title: 'Equipment demo — Hario rep',
      description: 'Brewer demo for the cafe.',
      daysFromNowVal: 2,
      startHour: 14,
      durationHours: 1,
      attendees: [a('kai'), a('riley'), actor('Yuki Watanabe', 'yuki@hario.co.jp')],
    }),
    eventAt({
      title: 'Wholesale onboarding — Olive & Vine',
      description: 'Video call with Mateo to walk through pricing and ordering.',
      daysFromNowVal: 4,
      startHour: 17,
      durationHours: 1,
      attendees: [a('sam'), a('mateo')],
    }),
    eventAt({
      title: 'Spring Blend cupping — Hatch',
      description: 'Cupping v2 in Brooklyn with Priya and the Hatch team.',
      daysFromNowVal: 8,
      startHour: 21,
      durationHours: 2,
      attendees: [a('kai'), a('priya')],
    }),
    eventAt({
      title: 'Coffee Expo NYC',
      description: 'Three-day specialty coffee expo. Sam attending.',
      daysFromNowVal: 14,
      startHour: 14,
      durationHours: 8,
      attendees: [a('sam')],
    }),
    eventAt({
      title: 'Site visit — Finca Esperanza',
      description: "Two days at Carmen's farm during the sourcing trip.",
      daysFromNowVal: 21,
      startHour: 14,
      durationHours: 8,
      attendees: [a('diego'), a('carmen')],
    }),
  ];

  return { calendar, events };
};

// -----------------------------------------------------------------------------
// Project + tasks
// -----------------------------------------------------------------------------

const makeProject = (people: Record<PersonKey, Person.Person>): { project: Project.Project; tasks: Task.Task[] } => {
  const project = Project.make({
    name: 'Spring Blend Launch',
    description: 'New seasonal espresso blend targeting wholesale espresso bars. Going live in 6 weeks.',
  });

  const projectRef = Ref.make(project);

  const tasks: Task.Task[] = [
    Task.make({
      title: 'Source green coffee — Esperanza + Guatemalan parcel',
      status: 'done',
      priority: 'high',
      assigned: Ref.make(people.diego),
      project: projectRef,
      description: 'Lock contracts with Carmen and the importer for the Guatemalan parcel.',
    }),
    Task.make({
      title: 'Finalize roast curve (v3)',
      status: 'in-progress',
      priority: 'high',
      assigned: Ref.make(people.kai),
      project: projectRef,
      description: 'Currently on v2 with adjusted development time. One more iteration before sign-off.',
    }),
    Task.make({
      title: 'Send v2 samples to wholesalers',
      status: 'in-progress',
      priority: 'medium',
      assigned: Ref.make(people.sam),
      project: projectRef,
      description: 'North Star, Hatch, Olive & Vine. 2 lb each.',
    }),
    Task.make({
      title: 'Design label — Letterform Press',
      status: 'in-progress',
      priority: 'medium',
      assigned: Ref.make(people.riley),
      project: projectRef,
      description: 'Final draft due to the printer in 10 days.',
    }),
    Task.make({
      title: 'Schedule launch cuppings (Oakland + remote)',
      status: 'todo',
      priority: 'medium',
      assigned: Ref.make(people.sam),
      project: projectRef,
    }),
    Task.make({
      title: 'Publish product page + open preorders',
      status: 'todo',
      priority: 'low',
      assigned: Ref.make(people.riley),
      project: projectRef,
      description: 'Webshop + email blast to subscribers.',
    }),
  ];

  return { project, tasks };
};

// -----------------------------------------------------------------------------
// Markdown notes (with inline DXN links and block embeds)
// -----------------------------------------------------------------------------

const makeNotes = (
  people: Record<PersonKey, Person.Person>,
  organizations: Record<OrgKey, Organization.Organization>,
  project: Project.Project,
): Markdown.Document[] => {
  // Helpers — produce markdown link / block-embed syntax that the editor understands.
  // Use space-relative URIs so links remain valid when the snapshot is imported into a new space.
  const localDxn = (obj: Obj.Unknown) => EID.make({ entityId: obj.id });
  const lnk = (label: string, obj: Obj.Unknown) => `[${label}](${localDxn(obj)})`;
  const emb = (label: string, obj: Obj.Unknown) => `![${label}](${localDxn(obj)})`;

  return [
    Markdown.make({
      name: 'Cupping notes — Finca Esperanza Lot #42',
      content: [
        '# Cupping notes — Finca Esperanza Lot #42',
        '',
        `**Farm:** ${lnk('Finca Esperanza', organizations.fincaEsperanza)} · **Contact:** ${lnk('Carmen Restrepo', people.carmen)}`,
        '',
        `**Date:** ${daysAgo(20, 10).slice(0, 10)} · **Cuppers:** ${lnk('Kai', people.kai)}, ${lnk('Diego', people.diego)}, ${lnk('Sam', people.sam)}`,
        '',
        '## Profile',
        '',
        '- **Fragrance/Aroma:** Stone fruit, jasmine, light cocoa.',
        '- **Acidity:** Bright, malic, well-structured.',
        '- **Body:** Medium, silky.',
        '- **Flavor:** Red apple, raspberry, milk chocolate, almond finish.',
        '- **Aftertaste:** Long, clean, slightly floral.',
        '',
        '## Scores',
        '',
        '| Cupper | Score |',
        '| --- | --- |',
        '| Kai | 87.5 |',
        '| Diego | 88.0 |',
        '| Sam | 87.0 |',
        '',
        '## Notes',
        '',
        'Best lot Carmen has sent us in three years. Worth pushing into the Spring Blend at a higher ratio than we initially planned.',
      ].join('\n'),
    }),
    Markdown.make({
      name: 'Q2 sourcing trip — itinerary',
      content: [
        '# Q2 sourcing trip — itinerary',
        '',
        `**Traveler:** ${lnk('Diego Alvarez', people.diego)}`,
        `**Dates:** ${daysFromNow(21).slice(0, 10)} → ${daysFromNow(35).slice(0, 10)}`,
        '',
        '## Colombia (Huila)',
        '',
        `**Host:** ${lnk('Carmen Restrepo', people.carmen)} · ${lnk('Finca Esperanza', organizations.fincaEsperanza)}`,
        '',
        '- Land in Bogotá; drive to Neiva.',
        '- Two days at Finca Esperanza with Carmen.',
        '- Visit two new lots recommended by our importer.',
        '- Return to Bogotá; fly out.',
        '',
        '## Ethiopia (Sidamo)',
        '',
        `**Host:** ${lnk('Abel Tadesse', people.abel)} · ${lnk('Sidamo Cooperative', organizations.sidamoCoop)}`,
        '',
        '- Arrive Addis Ababa; meet Abel.',
        '- Three days in Sidamo (cooperative + two member washing stations).',
        '- Cup the new harvest in Addis before flying home.',
        '',
        '## Buying targets',
        '',
        '- Colombia: lock 18 bags (Esperanza) + 6 bags (new lot if it cups above 87).',
        '- Ethiopia: confirm the full container of lot 42; optionally add a smaller naturals lot.',
      ].join('\n'),
    }),
    Markdown.make({
      name: 'Spring blend tasting protocol',
      content: [
        '# Spring blend — tasting protocol',
        '',
        `Project: ${emb('Spring Blend Launch', project)}`,
        '',
        '## Setup',
        '',
        '- Prepare 4 samples per session: v1, v2, v3, and the control (current Linden blend).',
        '- Grind 10 g per sample, 200 ml at 94 °C.',
        '- Evaluate dry fragrance, wet aroma, and taste at 4-min, 8-min, 12-min intervals.',
        '',
        '## Brew parameters',
        '',
        '1. **Espresso:** 18 g in / 36 g out / 27–30 s.',
        '2. **Filter:** 1:16 ratio, 4:00 total time.',
        '',
        '## Scoring dimensions',
        '',
        'Fragrance/Aroma · Flavour · Aftertaste · Acidity · Body · Balance · Uniformity · Cleanliness · Sweetness',
        '',
        '## Key targets',
        '',
        '- Espresso-forward: good body at 1:2.5 ratio.',
        '- Profile: fruit-forward (berry, stone fruit), chocolate mid, clean finish.',
        '- Score on the SCA form, then add a short qualitative note.',
        '- Re-cup after 7 days to check for stale notes.',
      ].join('\n'),
    }),
  ];
};

// -----------------------------------------------------------------------------
// Roast Log — custom exemplar schema entries + Table / Kanban views
// -----------------------------------------------------------------------------

const makeRoastLogs = (people: Record<PersonKey, Person.Person>): RoastLog[] => [
  // --- approved: past batches that cleared QC ---
  makeRoastLog({
    title: 'Finca Esperanza Lot #42 — Batch 1',
    date: daysAgo(28),
    origin: 'Colombia / Finca Esperanza / Lot #42',
    machine: 'Loring S15',
    roaster: Ref.make(people.kai),
    greenWeightKg: 15,
    roastWeightKg: 12.6,
    chargeTemp: 205,
    firstCrackTime: '9:18',
    developmentTime: '1:45',
    dropTemp: 209,
    roastLevel: 'city',
    status: 'approved',
    notes:
      'Clean reference curve for the Spring Blend. Berry up front, long chocolate finish. Approved for production.',
  }),
  makeRoastLog({
    title: 'Finca Esperanza Lot #42 — Batch 2',
    date: daysAgo(21),
    origin: 'Colombia / Finca Esperanza / Lot #42',
    machine: 'Loring S15',
    roaster: Ref.make(people.kai),
    greenWeightKg: 15,
    roastWeightKg: 12.5,
    chargeTemp: 205,
    firstCrackTime: '9:22',
    developmentTime: '1:50',
    dropTemp: 210,
    roastLevel: 'city',
    status: 'approved',
    notes: 'Confirmed the curve. Added 5 s to development — slightly more body, stone fruit more pronounced. Approved.',
  }),
  makeRoastLog({
    title: 'Sidamo Coop Natural — Lot 12A',
    date: daysAgo(14),
    origin: 'Ethiopia / Sidamo Cooperative / Natural Lot 12A',
    machine: 'Loring S15',
    roaster: Ref.make(people.diego),
    greenWeightKg: 12,
    roastWeightKg: 10.1,
    chargeTemp: 200,
    firstCrackTime: '8:55',
    developmentTime: '1:30',
    dropTemp: 207,
    roastLevel: 'light',
    status: 'approved',
    notes:
      'Blueberry and lemon zest on the nose. Very clean natural process — excellent for the single-origin filter menu.',
  }),
  // --- cupped: awaiting final approval ---
  makeRoastLog({
    title: 'Spring Blend — Production Run 1',
    date: daysAgo(5),
    origin: 'Colombia / Finca Esperanza + Ethiopia / Sidamo (70/30)',
    machine: 'Loring S15',
    roaster: Ref.make(people.kai),
    greenWeightKg: 30,
    roastWeightKg: 25.3,
    chargeTemp: 206,
    firstCrackTime: '9:25',
    developmentTime: '1:52',
    dropTemp: 210,
    roastLevel: 'city',
    status: 'cupped',
    notes:
      'First full blend run. Cupped this morning — jasmine and dark cacao hitting the brief. Slight unevenness in the drum; next run increase charge rate 2 %.',
  }),
  // --- roasted: cooling / resting, not yet cupped ---
  makeRoastLog({
    title: 'Finca Esperanza Lot #42 — Dev Batch',
    date: daysAgo(2),
    origin: 'Colombia / Finca Esperanza / Lot #42',
    machine: 'Loring S15',
    roaster: Ref.make(people.kai),
    greenWeightKg: 5,
    chargeTemp: 203,
    firstCrackTime: '9:10',
    developmentTime: '2:05',
    dropTemp: 211,
    roastLevel: 'city+',
    status: 'roasted',
    notes: 'Longer development trial for espresso use. Resting — cup on day 4.',
  }),
  makeRoastLog({
    title: 'Honduras El Puente — Sample Lot',
    date: daysAgo(1),
    origin: 'Honduras / Cooperativa El Puente / Sample',
    machine: 'Loring S15',
    roaster: Ref.make(people.diego),
    greenWeightKg: 3,
    chargeTemp: 198,
    firstCrackTime: '8:40',
    developmentTime: '1:25',
    dropTemp: 205,
    roastLevel: 'light',
    status: 'roasted',
    notes: 'New origin evaluation. Resting overnight before cupping.',
  }),
  // --- planned: upcoming ---
  makeRoastLog({
    title: 'Spring Blend — Production Run 2',
    date: daysFromNow(3),
    origin: 'Colombia / Finca Esperanza + Ethiopia / Sidamo (70/30)',
    machine: 'Loring S15',
    roaster: Ref.make(people.kai),
    greenWeightKg: 30,
    status: 'planned',
    notes: 'Increase charge rate 2 % vs Run 1 to address drum unevenness. Schedule cupping on day 5.',
  }),
  makeRoastLog({
    title: 'Colombia Huila — Pre-production',
    date: daysFromNow(7),
    origin: 'Colombia / Huila Region / New lot (TBC)',
    machine: 'Loring S15',
    roaster: Ref.make(people.diego),
    greenWeightKg: 10,
    status: 'planned',
    notes: 'Pre-production evaluation for potential Q3 addition. Diego to confirm lot details with supplier.',
  }),
];

/**
 * Add a "Roast Log" top-level collection with Table and Kanban views over the custom RoastLog schema,
 * then return the collection for wiring into the root.
 *
 * We persist the schema via space.db.addType() so that a TypeSchema ECHO object
 * is stored in the space itself. At runtime the Table/Kanban plugins resolve the base schema from that
 * object — the View's projection.schema field is reserved for user overrides only, not the base schema.
 */
const addRoastLogCollection = async (
  space: Space,
  people: Record<PersonKey, Person.Person>,
): Promise<Collection.Collection> => {
  const typename = 'example.type.roastLog';

  // db.addType creates the TypeSchema ECHO object in the space so the runtime can
  // discover and render the schema without it being compiled into the app.
  const roastLogType = await space.db.addType(RoastLog);
  Type.update(roastLogType, (draft) => {
    draft.name = 'Roast Log';
  });

  const entries = makeRoastLogs(people);
  entries.forEach((entry) => space.db.add(entry));

  const { view: tableView } = await ViewModel.makeFromDatabase({
    db: space.db,
    typename,
    fields: [
      'title',
      'date',
      'origin',
      'roaster',
      'status',
      'roastLevel',
      'chargeTemp',
      'firstCrackTime',
      'developmentTime',
      'dropTemp',
    ],
  });
  const tableObj = space.db.add(Table.make({ name: 'Table', view: tableView }));

  const { view: kanbanView } = await ViewModel.makeFromDatabase({
    db: space.db,
    typename,
    fields: ['title', 'origin', 'date', 'roaster', 'notes'],
    pivotFieldName: 'status',
  });
  const kanbanObj = space.db.add(Kanban.make({ name: 'Kanban', view: kanbanView }));

  return makeCollection(space, 'Roast Log', [Ref.make(tableObj), Ref.make(kanbanObj)]);
};

// -----------------------------------------------------------------------------
// Sketches — tldraw v3 store format
//
// Records are created via the @tldraw/tlschema + @tldraw/store API so the
// canvas content is always in the exact format the installed tldraw version
// expects. @tldraw/tlschema and @tldraw/store have no DOM dependencies and
// work fine in Node.js.
//
// ⚠️  tldraw v3 IndexKey rules (fractional indexing):
//   - Every shape and page needs an `index` field that is a valid IndexKey.
//   - Valid format: one or more lowercase letters followed by digits/alphanumeric
//     (e.g. 'a1', 'a2', 'a9', 'a10', 'a1J', 'b0V').
//   - INVALID: single-letter keys like 'a', 'b'; or bare-letter-then-digit
//     patterns that don't survive fractional-index round-trips like 'b1', 'b2'.
//     These look reasonable but throw at `store.put()` time:
//       ValidationError: At shape(type = geo).index: Expected an index key, got "b2"
//   - Safe rule: use 'a1', 'a2', … 'a9', 'a10', 'a11', … for sequential shapes
//     on a single page.  Never use 'b1', 'b2', etc. as a "next row".
//   - The error is silently swallowed by plugin-sketch's useAsyncEffect, so a
//     bad index key results in an empty canvas with no console error in the UI.
//   - Upstream reference: packages/plugins/plugin-sketch/src/hooks/useStoreAdapter.ts
// -----------------------------------------------------------------------------

// Minimal tldraw v3 schema with geo shapes only.
const tlSchema = createTLSchema({
  shapes: { geo: { props: geoShapeProps, migrations: geoShapeMigrations } },
});

/**
 * Create a tldraw v3 canvas content map seeded with the given geo shapes.
 * Returns a flat record map (`{ [id: string]: TLRecord }`) compatible with
 * the Canvas.content ECHO field.
 */
const makeTLCanvas = (pageId: string, pageName: string, shapes: TLRecord[]): Record<string, unknown> => {
  const store = new Store<TLRecord, any>({
    schema: tlSchema as any,
    props: { defaultName: '', assets: { upload: async () => '', resolve: () => '' }, onMount: () => {} } as any,
  });
  store.put(
    [
      DocumentRecordType.create({ id: TLDOCUMENT_ID }),
      PageRecordType.create({ id: pageId as any, name: pageName, index: 'a1' as IndexKey }),
      ...shapes,
    ],
    'initialize',
  );
  return store.serialize('document') as Record<string, unknown>;
};

/**
 * Build a geo shape record.
 *
 * @param id   - Shape ID suffix (prefixed with `shape:`).
 * @param page - Parent page ID (e.g. `'page:bramble-floor'`).
 * @param idx  - Fractional-index key. Use 'a1', 'a2', … 'a9', 'a10', 'a11', …
 *   for sequential shapes. Do NOT use 'b1', 'b2', etc. — those fail tldraw v3
 *   IndexKey validation and silently produce an empty canvas in the UI.
 */
const tlGeo = (
  id: string,
  page: string,
  idx: string,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  color: string,
  fill: string,
): TLRecord =>
  ({
    typeName: 'shape',
    id: `shape:${id}`,
    type: 'geo',
    x,
    y,
    rotation: 0,
    index: idx as IndexKey,
    parentId: page,
    isLocked: false,
    opacity: 1,
    meta: {},
    props: {
      w,
      h,
      geo: 'rectangle',
      color,
      labelColor: 'black',
      fill,
      dash: 'draw',
      size: 'm',
      font: 'draw',
      text,
      align: 'middle',
      verticalAlign: 'middle',
      growY: 0,
      url: '',
      scale: 1,
    },
  }) as unknown as TLRecord;

const makeFloorPlanContent = (): Record<string, unknown> => {
  const PAGE = 'page:bramble-floor';
  const g = (
    id: string,
    idx: string,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: string,
    fill: string,
  ) => tlGeo(id, PAGE, idx, x, y, w, h, text, color, fill);

  return makeTLCanvas(PAGE, 'Roastery Floor Plan', [
    // Outer boundary (no label — the sketch name serves as the title)
    g('fp-outer', 'a1', 0, 0, 800, 580, '', 'black', 'none'),
    // Loading dock (top strip)
    g('fp-dock', 'a2', 20, 20, 760, 80, 'Loading Dock', 'grey', 'semi'),
    // Green coffee storage (left middle)
    g('fp-storage', 'a3', 20, 120, 220, 200, 'Green Coffee\nStorage', 'green', 'semi'),
    // Roasting bay (right/center middle)
    g('fp-roasting', 'a4', 260, 120, 520, 200, 'Roasting Bay', 'orange', 'semi'),
    // Packaging (left lower)
    g('fp-packaging', 'a5', 20, 340, 220, 120, 'Packaging', 'light-blue', 'semi'),
    // Café bar (right lower)
    g('fp-cafe', 'a6', 260, 340, 520, 120, 'Café Bar', 'yellow', 'semi'),
    // Retail & tasting counter (bottom strip)
    g('fp-retail', 'a7', 20, 480, 760, 80, 'Retail & Tasting Counter', 'violet', 'semi'),
  ]);
};

// Spring Blend Flavor Wheel — 4-column rectangle grid.
// Each column is one flavor family (Fruit / Chocolate / Floral / Spice);
// rows beneath each header list the specific tasting notes.
//
// Layout:
//   Row 0 (y=0,   h=60): full-width title bar
//   Row 1 (y=80,  h=80): 4 category headers, colored fill
//   Row 2 (y=180, h=60): first tasting note per category
//   Row 3 (y=260, h=60): second tasting note per category
//   Column width: 190 px  →  total canvas: 760 × 340 px
const makeFlavorWheelContent = (): Record<string, unknown> => {
  const PAGE = 'page:flavor-wheel';
  const COL_W = 190;
  const g = (
    id: string,
    idx: string,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: string,
    fill: string,
  ) => tlGeo(id, PAGE, idx, x, y, w, h, text, color, fill);

  return makeTLCanvas(PAGE, 'Spring Blend Flavor Wheel', [
    // Row 0: title
    g('fw-title', 'a1', 0, 0, 4 * COL_W, 60, 'Spring Blend — Flavor Profile', 'black', 'semi'),
    // Row 1: category headers
    g('fw-cat-fruit', 'a2', 0, 80, COL_W, 80, 'Fruit', 'red', 'semi'),
    g('fw-cat-choc', 'a3', COL_W, 80, COL_W, 80, 'Chocolate', 'orange', 'semi'),
    g('fw-cat-floral', 'a4', 2 * COL_W, 80, COL_W, 80, 'Floral', 'violet', 'semi'),
    g('fw-cat-spice', 'a5', 3 * COL_W, 80, COL_W, 80, 'Spice', 'yellow', 'semi'),
    // Row 2: first tasting note per family
    g('fw-n1-fruit', 'a6', 0, 180, COL_W, 60, 'Berry', 'red', 'none'),
    g('fw-n1-choc', 'a7', COL_W, 180, COL_W, 60, 'Dark Cacao', 'orange', 'none'),
    g('fw-n1-floral', 'a8', 2 * COL_W, 180, COL_W, 60, 'Jasmine', 'violet', 'none'),
    g('fw-n1-spice', 'a9', 3 * COL_W, 180, COL_W, 60, 'Cardamom', 'yellow', 'none'),
    // Row 3: second tasting note per family
    g('fw-n2-fruit', 'a10', 0, 260, COL_W, 60, 'Stone Fruit', 'red', 'none'),
    g('fw-n2-choc', 'a11', COL_W, 260, COL_W, 60, 'Hazelnut', 'orange', 'none'),
    g('fw-n2-floral', 'a12', 2 * COL_W, 260, COL_W, 60, 'Rose', 'violet', 'none'),
    g('fw-n2-spice', 'a13', 3 * COL_W, 260, COL_W, 60, 'Cinnamon', 'yellow', 'none'),
  ]);
};

const makeSketches = (): Sketch.Sketch[] => [
  Sketch.make({ name: 'Roastery floor plan', canvas: { content: makeFloorPlanContent() } }),
  Sketch.make({ name: 'Spring blend flavor wheel', canvas: { content: makeFlavorWheelContent() } }),
];

// -----------------------------------------------------------------------------
// Sheets
// -----------------------------------------------------------------------------

const makeSheets = (): Sheet.Sheet[] => {
  const greenInventory = Sheet.make({
    name: 'Green coffee inventory',
    rows: 12,
    columns: 6,
    cells: {
      A1: { value: 'Origin' },
      B1: { value: 'Lot' },
      C1: { value: 'Process' },
      D1: { value: 'KG' },
      E1: { value: 'Cost/kg' },
      F1: { value: 'Total' },
      A2: { value: 'Colombia — Esperanza' },
      B2: { value: 'Lot A' },
      C2: { value: 'Washed' },
      D2: { value: 180 },
      E2: { value: 11.5 },
      F2: { value: '=D2*E2' },
      A3: { value: 'Ethiopia — Sidamo' },
      B3: { value: 'Lot 42' },
      C3: { value: 'Natural' },
      D3: { value: 240 },
      E3: { value: 13.2 },
      F3: { value: '=D3*E3' },
      A4: { value: 'Guatemala — Antigua' },
      B4: { value: 'Lot 7' },
      C4: { value: 'Washed' },
      D4: { value: 90 },
      E4: { value: 10.8 },
      F4: { value: '=D4*E4' },
      A5: { value: 'Peru — Cajamarca' },
      B5: { value: 'Lot 3' },
      C5: { value: 'Washed' },
      D5: { value: 60 },
      E5: { value: 9.6 },
      F5: { value: '=D5*E5' },
      A6: { value: 'TOTAL' },
      D6: { value: '=SUM(D2:D5)' },
      F6: { value: '=SUM(F2:F5)' },
    },
  });

  const priceList = Sheet.make({
    name: 'Wholesale price list',
    rows: 10,
    columns: 4,
    cells: {
      A1: { value: 'SKU' },
      B1: { value: 'Product' },
      C1: { value: 'Wholesale / lb' },
      D1: { value: 'Retail / 12 oz' },
      A2: { value: 'LIN-12' },
      B2: { value: 'Linden Blend' },
      C2: { value: 18 },
      D2: { value: 19 },
      A3: { value: 'FN-12' },
      B3: { value: 'Field Notes Blend' },
      C3: { value: 18 },
      D3: { value: 19 },
      A4: { value: 'LS-12' },
      B4: { value: 'Late Shift' },
      C4: { value: 17 },
      D4: { value: 18 },
      A5: { value: 'ESP-12' },
      B5: { value: 'Esperanza Single-Origin' },
      C5: { value: 24 },
      D5: { value: 26 },
      A6: { value: 'SID-12' },
      B6: { value: 'Sidamo Single-Origin' },
      C6: { value: 24 },
      D6: { value: 26 },
      A7: { value: 'SB-12' },
      B7: { value: 'Spring Blend (preorder)' },
      C7: { value: 21 },
      D7: { value: 22 },
      A9: { value: 'AVG wholesale' },
      C9: { value: '=AVERAGE(C2:C7)' },
      A10: { value: 'AVG retail' },
      D10: { value: '=AVERAGE(D2:D7)' },
    },
  });

  return [greenInventory, priceList];
};
