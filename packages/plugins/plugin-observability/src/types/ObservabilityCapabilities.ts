//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type Observability as ObservabilityNs } from '@dxos/observability';

import { meta } from '#meta';

export const Namespace = Capability.makeSingleton<string>()(`${meta.profile.key}.capability.namespace`);

export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

export const StateSchema = Schema.mutable(
  Schema.Struct({
    group: Schema.optional(Schema.String),
    notified: Schema.optional(Schema.Boolean),
  }),
);

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
