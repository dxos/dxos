//
// Copyright 2026 DXOS.org
//

/** Source string used in `AccessToken.source` and `Obj.Meta.keys[i].source` for Linear. */
export const LINEAR_SOURCE = 'linear.app';

/** Connector id of a connection that acts as the person who authorized it. */
export const LINEAR_PROVIDER_ID = 'linear';

/** Connector id of a connection that acts as DXOS's Linear app (`actor=app`). */
export const LINEAR_APP_PROVIDER_ID = 'linear-app';

/** Linear's GraphQL endpoint. */
export const LINEAR_API_URL = 'https://api.linear.app/graphql';

/** Linear's MCP server. It takes Linear OAuth tokens as a bearer token, so both Linear connectors expose it. */
export const LINEAR_MCP_ENDPOINT = { url: 'https://mcp.linear.app/mcp', protocol: 'http' } as const;
