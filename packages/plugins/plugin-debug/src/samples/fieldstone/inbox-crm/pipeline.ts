//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import * as Kanban from '@dxos/plugin-kanban/Kanban';
import * as KanbanConstants from '@dxos/plugin-kanban/KanbanConstants';
import { type Organization } from '@dxos/types';

import { type Make } from '../util.ts';
import { type OrgKey } from './organizations.ts';

/** Pipeline stages in board order; items kanban columns are titled by their key, so the keys are the stage names. */
export const STAGES = ['Lead', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'Closed won', 'Closed lost'] as const;

export type Stage = (typeof STAGES)[number];

/** Each stage's customers, in card order. */
export const PIPELINE = {
  'Lead': ['halcyon', 'kestrel'],
  'Qualified': ['vantage', 'corvid', 'larkspur'],
  'Demo': ['brightwater'],
  'Proposal': ['meridian', 'aldermoor'],
  'Negotiation': ['northpine', 'tidewater'],
  'Closed won': ['okapi', 'lumen'],
  'Closed lost': ['pallas'],
} as const satisfies Record<Stage, ReadonlyArray<OrgKey>>;

export type Pipeline = {
  readonly kanban: Kanban.Kanban;
};

/**
 * An items Kanban over the customer organizations, so each card is the Organization card with its logo. Its
 * pivot field is empty because `Organization` has no stage property: the arrangement alone places each card,
 * and dragging a card rewrites the arrangement rather than the organization.
 */
export const makePipeline = (orgs: Record<OrgKey, Organization.Organization>): Make<Pipeline> =>
  Effect.gen(function* () {
    const kanban = yield* Database.add(
      Kanban.makeItems({
        name: 'Sales pipeline',
        pivotField: '',
        items: STAGES.flatMap((stage) => PIPELINE[stage].map((key) => Ref.make(orgs[key]))),
        arrangement: {
          order: [...STAGES],
          columns: {
            // Hidden because every customer sits in a stage.
            [KanbanConstants.UNCATEGORIZED_VALUE]: { ids: [], hidden: true },
            ...Object.fromEntries(STAGES.map((stage) => [stage, { ids: PIPELINE[stage].map((key) => orgs[key].id) }])),
          },
        },
      }),
    );

    return { kanban };
  });
