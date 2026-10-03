//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { Person, Task } from '@dxos/types';

/** Where a relay is in its life: delivered to the recipient, then reported back to the requester. */
export const Status = Schema.Literals(['pending', 'delivered', 'reported', 'failed', 'expired']);
export type Status = Schema.Schema.Type<typeof Status>;

/** Default time the agent has to deliver a relay before it reports back that it could not. */
export const DEFAULT_DUE_HOURS = 48;

/**
 * The status the relay's `Task` moves to: `delivered` leaves the task `started` because the report
 * back to the requester is still owed; only `reported` finishes it.
 */
export const taskStatus: Record<Status, Task.Status> = {
  pending: 'todo',
  delivered: 'started',
  reported: 'done',
  failed: 'failed',
  expired: 'cancelled',
};

/**
 * The delivery record of a relay ("tell Josiah about X"). The work itself is a `Task` in the agent's
 * own `TaskSet`; this object adds who it is for, who asked, and what happened, without changing the
 * shared `Task` schema. Parented to the agent, so it cascades with it.
 */
export class Relay extends Type.makeObject<Relay>(DXN.make('org.dxos.type.agent.relay', '0.1.0'))(
  Schema.Struct({
    task: Ref.Ref(Task.Task).annotate({ title: 'Task' }),
    recipient: Ref.Ref(Obj.Unknown).annotate({ title: 'Recipient', description: 'The person or organization.' }),
    requester: Schema.optional(Ref.Ref(Person.Person).annotate({ title: 'Requester' })),
    replyChannelId: Schema.optional(
      Schema.String.annotate({
        title: 'Reply channel',
        description: "The requester's Discord channel or thread, where the outcome is reported.",
      }),
    ),
    message: Schema.String.annotate({ title: 'Message', description: 'What to tell the recipient.' }),
    dueAt: Format.DateTime.annotate({ title: 'Due' }),
    status: Status.annotate({ title: 'Status' }),
    deliveredAt: Schema.optional(Format.DateTime.annotate({ title: 'Delivered' })),
    reportedAt: Schema.optional(Format.DateTime.annotate({ title: 'Reported' })),
    outcome: Schema.optional(
      Schema.String.annotate({ title: 'Outcome', description: 'What the recipient said, or why it failed.' }),
    ),
  }).pipe(
    Annotation.LabelAnnotation.set(['message']),
    Annotation.IconAnnotation.set({ icon: 'ph--arrows-left-right--regular', hue: 'teal' }),
  ),
) {}

export type MakeProps = Omit<Obj.MakeProps<typeof Relay>, 'status' | 'dueAt'> & {
  agent: Agent.Agent;
  dueAt?: string;
  status?: Status;
};

/** Creates a pending relay owned by the agent, due {@link DEFAULT_DUE_HOURS} from now unless given. */
export const make = ({ agent, dueAt, status = 'pending', ...props }: MakeProps): Relay =>
  Obj.make(Relay, {
    ...props,
    status,
    dueAt: dueAt ?? new Date(Date.now() + DEFAULT_DUE_HOURS * 3_600_000).toISOString(),
    [Obj.Parent]: agent,
  });

/** Whether the relay is still open and past its due date. */
export const isOverdue = (relay: Relay, now = Date.now()): boolean =>
  (relay.status === 'pending' || relay.status === 'delivered') && Date.parse(relay.dueAt) < now;
