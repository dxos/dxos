//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { AccessToken } from '@dxos/link';

/**
 * A reusable authenticated connection to an external service: a stored
 * {@link AccessToken} plus the {@link Connector} (`connectorId`) that operates it.
 *
 * The connection is the durable, user-facing handle; the credential it holds is
 * an internal primitive (shared across subsystems), and the things it syncs are
 * external-sync `Cursor` objects (`@dxos/link`) whose `spec.source` is this
 * connection's access token — matched by token, not by a direct relation, since
 * `Cursor` is an infrastructure type with no dependency on `Connection`. One
 * connector backs many connections (e.g. several Gmail accounts); one connection
 * backs many cursors (e.g. several mailboxes). Routed by `connectorId` (not
 * `accessToken.source` alone — multiple connectors may share a source).
 */
export class Connection extends Type.makeObject<Connection>(DXN.make('org.dxos.type.connection', '0.1.0'))(
  Schema.Struct({
    /** Display name (e.g. "Work Gmail"); defaults to `${connector.label} · ${accessToken.account}`. */
    name: Schema.String.pipe(Schema.optional),
    /** Selects the {@link Connector} registry entry that operates this connection; optional for legacy rows. */
    connectorId: Schema.String.pipe(Schema.optional),
    /** Stored OAuth/API credential (internal primitive). */
    accessToken: Ref.Ref(AccessToken.AccessToken),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--plugs-connected--regular', hue: 'emerald' }),
  ),
) {}

export const instanceOf = (value: unknown): value is Connection => Obj.instanceOf(Connection, value);

export const make = (props: Obj.MakeProps<typeof Connection>) => Obj.make(Connection, props);
