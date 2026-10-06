//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

/**
 * What a memory records about its subjects. `note` is free-form markdown (see `body`); `directive`
 * holds a rule or preference until the `Rule`/`Preference` types of docs/ONTOLOGY.md §3 exist.
 */
// TODO(burdon): Move `directive` memories to Rule/Preference objects (docs/ONTOLOGY.md §3).
export const Kind = Schema.Literals([
  'fact',
  'preference',
  'goal',
  'commitment',
  'relationship',
  'event',
  'note',
  'directive',
]);
export type Kind = Schema.Schema.Type<typeof Kind>;

/** Whether the person said it (`stated`) or the agent concluded it (`inferred`). */
export const Origin = Schema.Literals(['stated', 'inferred']);
export type Origin = Schema.Schema.Type<typeof Origin>;

/** Memories are never overwritten: a contradiction supersedes, a mistake retracts. */
export const Status = Schema.Literals(['active', 'superseded', 'retracted']);
export type Status = Schema.Schema.Type<typeof Status>;

/**
 * One atomic, third-person claim the agent learned about one or more entities.
 * Linked to each entity it is about by a `HasSubject` relation (source = memory, target = entity).
 */
export class Memory extends Type.makeObject<Memory>(DXN.make('org.dxos.type.agent.memory', '0.1.0'))(
  Schema.Struct({
    content: Schema.String.annotate({ title: 'Content', description: 'One atomic third-person claim.' }),
    kind: Kind.annotate({ title: 'Kind' }),
    origin: Origin.annotate({ title: 'Origin' }),
    confidence: Schema.optional(
      Schema.Number.annotate({ title: 'Confidence', description: 'Confidence in the claim, from 0 to 1.' }),
    ),
    observedAt: Format.DateTime.annotate({ title: 'Observed' }),
    status: Status.annotate({ title: 'Status' }),
    supersedes: Schema.optional(
      Ref.Ref(Obj.Unknown).annotate({ title: 'Supersedes', description: 'The memory this one replaces.' }),
    ),
    source: Schema.optional(
      Ref.Ref(Obj.Unknown).annotate({ title: 'Source', description: 'The message or chat the claim came from.' }),
    ),
    // Optional and additive, so existing 0.1.0 memories still decode without a version bump.
    body: Schema.optional(
      Ref.Ref(Text.Text).pipe(
        Annotation.SetParent.set(),
        Schema.annotate({ title: 'Body', description: "A note's markdown; `content` is its one-line summary." }),
      ),
    ),
  }).pipe(
    Annotation.LabelAnnotation.set(['content']),
    Annotation.IconAnnotation.set({ icon: 'ph--brain--regular', hue: 'violet' }),
  ),
) {}

export type MakeProps = Omit<Obj.MakeProps<typeof Memory>, 'origin' | 'status' | 'observedAt'> &
  Partial<Pick<Obj.MakeProps<typeof Memory>, 'origin' | 'status' | 'observedAt'>>;

/** Creates an active memory observed now; the claim is `stated` unless said otherwise. */
export const make = ({ origin = 'stated', status = 'active', observedAt, ...props }: MakeProps): Memory =>
  Obj.make(Memory, { ...props, origin, status, observedAt: observedAt ?? new Date().toISOString() });
