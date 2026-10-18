//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Annotation, Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { Format, FormatAnnotation } from '@dxos/echo/Format';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';
import * as Kanban from '@dxos/plugin-kanban/Kanban';
import { ViewModel } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

import { type PersonKey } from '../team/index.ts';
import { type Make } from '../util.ts';
import { type ContactKey } from './contacts.ts';
import { type OrgKey } from './organizations.ts';
import { type Clock, dateOnly } from './util.ts';

/** Pipeline stages, in board order. */
export const STAGES = [
  { id: 'lead', title: 'Lead', color: 'neutral' },
  { id: 'qualified', title: 'Qualified', color: 'indigo' },
  { id: 'demo', title: 'Demo', color: 'sky' },
  { id: 'proposal', title: 'Proposal', color: 'purple' },
  { id: 'negotiation', title: 'Negotiation', color: 'amber' },
  { id: 'won', title: 'Closed won', color: 'emerald' },
  { id: 'lost', title: 'Closed lost', color: 'red' },
] as const;

export type Stage = (typeof STAGES)[number]['id'];

export const DEAL_TYPENAME = 'com.alienlabs.type.deal';

// A space-defined type rather than a plugin one: `Organization.status` has five fixed values, and a
// view Kanban pivots only on a single-select field, so the pipeline's stages need their own schema.
export const Deal = Type.makeObject(DXN.make(DEAL_TYPENAME, '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Deal' })),
    organization: Schema.optional(Ref.Ref(Organization.Organization).annotate({ title: 'Customer' })),
    contact: Schema.optional(Ref.Ref(Person.Person).annotate({ title: 'Contact' })),
    owner: Schema.optional(Ref.Ref(Person.Person).annotate({ title: 'Owner' })),
    stage: Schema.Literals(STAGES.map((stage) => stage.id)).pipe(
      FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      Schema.annotate({
        title: 'Stage',
        [PropertyMetaAnnotationId]: { singleSelect: { options: STAGES } },
      }),
    ),
    value: Schema.optional(Format.Currency({ decimals: 0, code: 'USD' }).annotate({ title: 'Annual value' })),
    closeDate: Schema.optional(Format.Date.annotate({ title: 'Close date' })),
    nextStep: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Next step' }))),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--handshake--regular', hue: 'emerald' }),
    Annotation.UserType.set(),
  ),
);

export const DEALS = [
  {
    key: 'halcyon',
    name: 'Halcyon Freight: Team plan',
    contact: 'priya',
    owner: 'kofi',
    stage: 'lead',
    value: 18_000,
    close: 75,
    nextStep: 'Intro call: Gradle build cache on their Android CI.',
  },
  {
    key: 'kestrel',
    name: 'Kestrel Energy: Business plan',
    contact: 'owen',
    owner: 'kofi',
    stage: 'lead',
    value: 42_000,
    close: 90,
    nextStep: 'Discovery call: Bazel remote cache and execution.',
  },
  {
    key: 'vantage',
    name: 'Vantage Aerospace: Enterprise, US region',
    contact: 'claire',
    owner: 'astrid',
    stage: 'qualified',
    value: 150_000,
    close: 70,
    nextStep: 'Technical deep dive on US-only storage with Omar and Anika.',
  },
  {
    key: 'brightwater',
    name: 'Brightwater Games: Business trial',
    contact: 'leo',
    owner: 'lucia',
    stage: 'demo',
    value: 21_600,
    close: 45,
    nextStep: 'Intro call to scope a two-week trial on their main Perforce stream.',
  },
  {
    key: 'meridian',
    name: 'Meridian Health Data: paid plan, 60 seats',
    contact: 'aisha',
    owner: 'astrid',
    stage: 'proposal',
    value: 28_800,
    close: 21,
    nextStep: 'Proposal review with Aisha and Kenji; SOC 2 Type I report within 60 days.',
  },
  {
    key: 'northpine',
    name: 'Northpine Robotics: renewal, 180 seats and a dedicated region',
    contact: 'grace',
    owner: 'lucia',
    stage: 'negotiation',
    value: 104_400,
    close: 30,
    nextStep: 'Two-year order form sent; cutover plan at the QBR.',
  },
  {
    key: 'tidewater',
    name: 'Tidewater Insurance: Enterprise, 220 seats',
    contact: 'rohan',
    owner: 'lucia',
    stage: 'negotiation',
    value: 105_600,
    close: 14,
    nextStep: 'MSA redlines: liability cap and breach-notice window.',
  },
  {
    key: 'okapi',
    name: 'Okapi Payments: Enterprise',
    contact: 'nadia',
    owner: 'astrid',
    stage: 'won',
    value: 38_400,
    close: -120,
    nextStep: 'Alerting follow-up: route hash-mismatch alerts to their on-call.',
  },
  {
    key: 'lumen',
    name: 'Lumen Biotech: Enterprise, 150 seats',
    contact: 'tobias',
    owner: 'lucia',
    stage: 'won',
    value: 72_000,
    close: -21,
    nextStep: 'Rollout check-in: second pipeline group onto the cache.',
  },
  {
    key: 'pallas',
    name: 'Pallas Retail Group: Enterprise',
    contact: 'carmen',
    owner: 'lucia',
    stage: 'lost',
    value: 72_000,
    close: -14,
    nextStep: 'Lost to a self-hosted cache. Revisit if a customer-hosted tier ships.',
  },
] as const satisfies ReadonlyArray<{
  key: OrgKey;
  name: string;
  contact: ContactKey;
  owner: PersonKey;
  stage: Stage;
  value: number;
  /** Expected or actual close, in days from the reference date. */
  close: number;
  nextStep: string;
}>;

export type DealKey = (typeof DEALS)[number]['key'];

export type Pipeline = {
  readonly kanban: Kanban.Kanban;
  readonly deals: Record<DealKey, Obj.Any>;
};

/**
 * One deal per customer on a space-defined `Deal` type, and a view Kanban over it pivoting on `stage`.
 * `Database.addType` stores the schema in the space, so the app renders a type it was not compiled with.
 */
export const makePipeline = (
  orgs: Record<OrgKey, Organization.Organization>,
  people: Record<ContactKey | PersonKey, Person.Person>,
): Make<Pipeline> =>
  Effect.gen(function* () {
    const clock: Clock = yield* SampleSpace.Clock;
    const dealType = yield* Database.addType(Deal);
    Type.update(dealType, (dealType) => {
      dealType.name = 'Deal';
    });

    const deals = yield* SampleSpace.seed(DEALS, (seed) =>
      Database.add(
        // Stamped with the persisted type so `@type` matches the EID the view's query filters by.
        Obj.make(Type.assertObject(dealType), {
          name: seed.name,
          organization: Ref.make(orgs[seed.key]),
          contact: Ref.make(people[seed.contact]),
          owner: Ref.make(people[seed.owner]),
          stage: seed.stage,
          value: seed.value,
          closeDate: dateOnly(clock, seed.close),
          nextStep: seed.nextStep,
        }),
      ),
    );

    const { db } = yield* Database.Service;
    const { view } = yield* Effect.promise(() =>
      ViewModel.makeFromDatabase({
        db,
        typename: DEAL_TYPENAME,
        fields: ['name', 'organization', 'contact', 'value', 'closeDate', 'nextStep'],
        pivotFieldName: 'stage',
      }),
    );
    const kanban = yield* Database.add(
      Kanban.make({
        name: 'Sales pipeline',
        view,
        arrangement: {
          order: STAGES.map((stage) => stage.id),
          columns: Object.fromEntries(
            STAGES.map((stage) => [
              stage.id,
              { ids: DEALS.filter((seed) => seed.stage === stage.id).map((seed) => deals[seed.key].id) },
            ]),
          ),
        },
      }),
    );

    return { kanban, deals };
  });
