//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Agent } from '@dxos/assistant-toolkit';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { Journal } from '@dxos/plugin-outliner';

/**
 * Represents a Sidekick instance. Manages an Agent and a Journal.
 */
export const Profile = Schema.Struct({
  name: Schema.optional(Schema.String),
  agent: Ref.Ref(Agent.Agent),
  journal: Ref.Ref(Journal.Journal),
  journalEnabled: Schema.optional(Schema.Boolean),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--brain--regular', hue: 'violet' }),
  Type.makeObject(DXN.make('org.dxos.type.sidekick.profile', '0.1.0')),
);

export type Profile = Type.InstanceType<typeof Profile>;

/** Creates a Sidekick profile with journal enabled by default. */
export const make = (props: { agent: Ref.Ref<Agent.Agent>; journal: Ref.Ref<Journal.Journal>; name?: string }) =>
  Obj.make(Profile, {
    name: props.name,
    agent: props.agent,
    journal: props.journal,
    journalEnabled: true,
  });
