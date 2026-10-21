//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import { McpToolkit } from '@dxos/mcp-client';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { MCP_PROVIDER_ID } from '../constants.ts';
import { ConnectorKeyInvalidError, McpServerUnavailableError } from '../operations/errors.ts';

const McpServerForm = Schema.Struct({
  url: Format.URL.annotate({
    title: 'Server URL',
    description: 'The MCP server endpoint, e.g. https://mcp.example.com/mcp.',
  }),
  token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password), Schema.optional).annotate({
    title: 'API key',
    description: 'Only for a server that takes a key. Leave empty to sign in, or for a server with no auth.',
  }),
});

type McpServerValues = Schema.Schema.Type<typeof McpServerForm>;

/**
 * Probes the server to decide how the connection authenticates: with the key given, with none, or by
 * signing in through MCP authorization when the server answers 401 without one.
 */
const submit = ({
  values,
  connector,
}: {
  values: McpServerValues;
  connector: ConnectorSpec.ConnectorEntry;
}): Effect.Effect<ConnectorSpec.CredentialFormResult, Error> =>
  Effect.gen(function* () {
    const endpoint: Connection.McpEndpoint = { url: values.url.trim(), protocol: 'http' };
    const source = new URL(endpoint.url).host;
    const apiKey = values.token?.trim() || undefined;
    const unauthorized = yield* McpToolkit.probe({ ...endpoint, apiKey }).pipe(
      Effect.as(false),
      Effect.catchTag('McpConnectionError', (error) =>
        error.unauthorized
          ? Effect.succeed(true)
          : Effect.fail(new McpServerUnavailableError({ message: error.message })),
      ),
    );
    if (unauthorized && apiKey) {
      return yield* Effect.fail(new ConnectorKeyInvalidError({ message: 'The MCP server rejected this API key.' }));
    }
    if (unauthorized) {
      return { kind: 'mcp-oauth' as const, endpoint };
    }

    const accessToken = apiKey ? Obj.make(AccessToken.AccessToken, { source, token: apiKey }) : undefined;
    const connection = Obj.make(Connection.Connection, {
      name: source,
      connectorId: connector.id,
      mcp: endpoint,
      ...(accessToken ? { accessToken: Ref.make(accessToken) } : {}),
    });
    return { kind: 'complete' as const, accessToken, connection };
  });

/** Any MCP server the user names by URL. Every connection made with it is an MCP server and nothing else. */
export const McpServerConnector: ConnectorSpec.ConnectorEntry = {
  id: MCP_PROVIDER_ID,
  // The host comes from the URL the user enters.
  source: '',
  label: 'Custom MCP Server',
  kind: 'custom',
  credentialForm: {
    schema: McpServerForm,
    defaultValues: { url: '' },
    onSubmit: submit,
  },
  mcp: (connection) => connection.mcp,
};
