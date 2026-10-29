//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Annotation, DXN, Obj, Type } from '@dxos/echo';

/** Key of the skill an agent sends email with; a plain key, so the config type need not import the skill. */
export const SKILL_KEY = 'org.dxos.skill.agentEmail';

/** `Channel.backend.kind` of a channel whose conversations are email threads, hosted by EDGE's compute-service. */
export const BACKEND_KIND = 'org.dxos.channel.backend.email';

/** Who may mail the agent when the config names nobody; EDGE applies the same default. */
export const DEFAULT_ALLOWED_SENDERS: readonly string[] = ['braneframe.com', 'dxos.org'];

/** The address and who may write to it; the create-channel form and the channel's properties panel edit these. */
export const Properties = Schema.Struct({
  handle: Schema.String.annotate({
    title: 'Address',
    description: 'The part before the @: `kai` receives mail for kai@dxos.ai.',
  }),
  displayName: Schema.optional(
    Schema.String.annotate({
      title: 'Display name',
      description: "The sender name on the agent's replies.",
    }),
  ),
  allowedSenders: Schema.Array(Schema.String).annotate({
    title: 'Allowed senders',
    description: 'Domains (dxos.org) and addresses (friend@gmail.com) whose mail reaches the agent; others bounce.',
  }),
});

export type Properties = Schema.Schema.Type<typeof Properties>;

/**
 * Config of an email-backed `Channel` (`Channel.backend.config`): the agent's address and its sender allowlist.
 * Connecting the channel claims the address on EDGE, which routes each email thread into its own chat of the agent.
 */
export class AgentEmail extends Type.makeObject<AgentEmail>(DXN.make('org.dxos.type.agent.email', '0.1.0'))(
  Schema.Struct({
    ...Properties.fields,
    /**
     * The handle EDGE holds for this channel, set on connect and cleared on disconnect. Kept apart from the editable
     * `handle` so a renamed address still releases the one it claimed.
     */
    claimedHandle: Schema.optional(Schema.String).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['handle']),
    Annotation.IconAnnotation.set({ icon: 'ph--envelope--regular', hue: 'amber' }),
    // Bound to every conversation of the channel's agent: its written text is not mailed, so this is how it answers.
    Skill.SkillsAnnotation.set([SKILL_KEY]),
  ),
) {}

export const instanceOf = (value: unknown): value is AgentEmail => Obj.instanceOf(AgentEmail, value);

export type MakeProps = Omit<Obj.MakeProps<typeof AgentEmail>, 'allowedSenders'> & {
  allowedSenders?: readonly string[];
};

/** Creates an email channel config; an empty allowlist takes {@link DEFAULT_ALLOWED_SENDERS}. */
export const make = ({ handle, allowedSenders, ...props }: MakeProps): AgentEmail =>
  Obj.make(AgentEmail, {
    ...props,
    handle: handle.trim().toLowerCase(),
    allowedSenders: [...(allowedSenders?.length ? allowedSenders : DEFAULT_ALLOWED_SENDERS)],
  });
