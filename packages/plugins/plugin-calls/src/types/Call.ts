//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

/**
 * Persistent transport descriptor for a {@link Call}.
 * Selects a `CallsCapabilities.CallTransportProvider` by `kind` and holds that
 * provider's persistent reconnection config (e.g. the SFU room id) so a call is
 * resumable. Mirrors `Channel.backend`.
 */
export const CallTransport = Schema.Struct({
  /**
   * Provider id, e.g. `org.dxos.call.transport.cloudflare`.
   */
  kind: Schema.String,

  /**
   * Provider-owned reconnection state.
   */
  config: Ref.Ref(Obj.Unknown),
});

export type CallTransport = Schema.Schema.Type<typeof CallTransport>;

/**
 * A slim, meeting-agnostic call: a persistent session/room so the "where" of a
 * conversation is known ahead of time. Notes, summary, transcript and
 * participants live on the `Meeting` hub (plugin-meeting), not here. Live state
 * (joined peers, media tracks) is runtime-only and owned by `CallManager`.
 */
export const Call = Schema.Struct({
  /**
   * User-defined name of the call.
   */
  name: Schema.String.pipe(Schema.optional),

  /**
   * Selects the live transport and holds its persistent reconnection config.
   */
  transport: CallTransport.pipe(FormInputAnnotation.set(false)),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--phone-call--regular', hue: 'indigo' }),
  Type.makeObject(DXN.make('org.dxos.type.call', '0.1.0')),
);

export type Call = Type.InstanceType<typeof Call>;

export const make = (props: { name?: string; transport: CallTransport }) =>
  Obj.make(Call, {
    name: props.name,
    transport: props.transport,
  });

/**
 * Provider id of the built-in Cloudflare transport.
 */
export const CLOUDFLARE_TRANSPORT_KIND = 'org.dxos.call.transport.cloudflare';

/**
 * Persistent reconnection config produced by the built-in Cloudflare transport
 * provider and stored in `CallTransport.config`. The SFU room id is the only
 * state required to resume a call.
 */
export const CloudflareTransportConfig = Schema.Struct({
  /**
   * SFU room id; stable so the call is resumable.
   */
  roomId: Schema.String,
}).pipe(Type.makeObject(DXN.make('org.dxos.type.call.transportCloudflare', '0.1.0')));

export type CloudflareTransportConfig = Type.InstanceType<typeof CloudflareTransportConfig>;
