//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as Capability from '@dxos/app-framework/Capability';
import { type Client } from '@dxos/client';
import { type Observability as ObservabilityNs } from '@dxos/observability';

import { meta } from '#meta';

export const Namespace = Capability.makeSingleton<string>()(`${meta.profile.key}.capability.namespace`);

export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

export const StateSchema = Schema.Struct({
  group: Schema.optional(Schema.String),
  notified: Schema.optional(Schema.Boolean),
}).mapFields(Struct.map(Schema.mutableKey));

export type State = Schema.Schema.Type<typeof StateSchema>;

export const State = Capability.makeSingleton<Atom.Writable<State>>()(`${meta.profile.key}.capability.state`);

export const Observability = Capability.makeSingleton<ObservabilityNs.Observability>()(
  `${meta.profile.key}.capability.observability`,
);

/**
 * Optional capability — when contributed, the help/feedback UI exposes a "Download logs" action.
 * The callback is responsible for the entire download (read store, encode, save file).
 */
export type LogDownloader = () => void | Promise<void>;
export const LogDownloader = Capability.makeSingleton<LogDownloader>()(`${meta.profile.key}.capability.logDownloader`);

// NOTE: This is cloned from the client plugin to avoid circular dependencies.
// TODO(burdon): Figure out how to share defs.
export const ClientCapability = Capability.makeSingleton<Client>()('org.dxos.plugin.client.capability.client');

// Cloned from the client plugin for the same reason: fired once its forked initialize()
// completes; modules reading initialized-only client APIs (`services`, `halo`, `spaces`)
// at activation ride this instead of the startup pass.
export const ClientInitialized = ActivationEvent.make('org.dxos.plugin.client.event.initialized');
