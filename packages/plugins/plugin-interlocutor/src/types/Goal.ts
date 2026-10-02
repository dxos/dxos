//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';

/** How far out the goal lands. */
export const Horizon = Schema.Literals(['now', 'quarter', 'year', 'long-term']);
export type Horizon = Schema.Schema.Type<typeof Horizon>;

/** The agent only proposes; the owner confirms, and the goal then runs its course. */
export const Status = Schema.Literals(['proposed', 'confirmed', 'active', 'achieved', 'dropped']);
export type Status = Schema.Schema.Type<typeof Status>;

/** A goal held by one or more people or organizations, optionally nested under a parent goal. */
export class Goal extends Type.makeObject<Goal>(DXN.make('org.dxos.type.interlocutor.goal', '0.1.0'))(
  Schema.Struct({
    title: Schema.String.annotate({ title: 'Title' }),
    description: Schema.optional(Schema.String.annotate({ title: 'Description' })),
    horizon: Horizon.annotate({ title: 'Horizon' }),
    status: Status.annotate({ title: 'Status' }),
    // A union ref is not expressible, so the Person/Organization constraint is checked by the operations.
    owners: Schema.Array(Ref.Ref(Obj.Unknown)).annotate({
      title: 'Owners',
      description: 'The people or organizations that hold the goal.',
    }),
    parent: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ title: 'Parent', description: 'The parent goal.' })),
  }).pipe(
    Annotation.LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--target--regular', hue: 'emerald' }),
  ),
) {}

export type MakeProps = Omit<Obj.MakeProps<typeof Goal>, 'status' | 'owners'> & {
  status?: Status;
  owners?: Obj.MakeProps<typeof Goal>['owners'];
};

/** Creates a goal; new goals are `proposed` until their owner confirms them. */
export const make = ({ status = 'proposed', owners, ...props }: MakeProps): Goal =>
  Obj.make(Goal, { ...props, status, owners: [...(owners ?? [])] });
