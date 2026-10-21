//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import * as AccessToken from './AccessToken.ts';

/** Where an MCP server is dialled. `'sse'` is the deprecated transport, kept for servers that have not moved to `'http'`. */
export const McpEndpoint = Schema.Struct({
  url: Schema.String,
  protocol: Schema.Literals(['http', 'sse']),
});

export interface McpEndpoint extends Schema.Schema.Type<typeof McpEndpoint> {}

/**
 * A reusable authenticated connection to an external service: a stored
 * {@link AccessToken} plus the {@link Connector} (`connectorId`) that operates it.
 *
 * The connection is the durable, user-facing handle; the credential it holds is
 * an internal primitive (shared across subsystems), and the things it syncs are
 * external-sync {@link Cursor} objects whose `spec.source` is this
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
    /** Stored OAuth/API credential (internal primitive); absent for a service that needs no auth. */
    accessToken: Ref.Ref(AccessToken.AccessToken).pipe(Schema.optional),
    /**
     * The MCP server a custom MCP connection dials. A connector with a fixed endpoint declares it in
     * code instead, so this is only set where the user supplied the URL.
     */
    mcp: McpEndpoint.pipe(Schema.optional),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--plugs-connected--regular', hue: 'emerald' }),
    Annotation.UserType.set(),
  ),
) {}

export const instanceOf = (value: unknown): value is Connection => Obj.instanceOf(Connection, value);

/**
 * The connection's credential. Only a connection to a service that needs no auth lacks one, and such
 * a connection neither syncs nor calls a service API, so reaching this without one is a bug.
 */
export const getAccessToken = (connection: Connection): Ref.Ref<AccessToken.AccessToken> => {
  invariant(connection.accessToken, 'Connection has no access token.');
  return connection.accessToken;
};

export const make = (props: Obj.MakeProps<typeof Connection>) => Obj.make(Connection, props);

/**
 * An MCP server a plugin ships, which takes no credential. It reaches chats from the registry as a
 * keyed connection, never from a space, and is off in a chat until the chat or its agent turns it on.
 */
export type Builtin = { key: string; name: string; mcp: McpEndpoint };

export const makeBuiltin = ({ key, name, mcp }: Builtin): Connection =>
  Obj.make(Connection, { [Obj.Meta]: { key }, name, mcp });

/** A built-in MCP server carries a registry key; a connection a space holds has none. */
export const isBuiltin = (connection: Connection): boolean => Obj.getMeta(connection).key !== undefined;
