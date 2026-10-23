//
// Copyright 2026 DXOS.org
//

/** Source string used in `AccessToken.source` and `Obj.Meta.keys[i].source` for GitHub. */
export const GITHUB_SOURCE = 'github.com';

/** Connector id of a connection that acts as the person who authorized it. */
export const GITHUB_PROVIDER_ID = 'github';

/** Connector id of a connection that acts as DXOS's GitHub App, installed on an account or org. */
export const GITHUB_APP_PROVIDER_ID = 'github-app';

/** Every connector whose connections authenticate to GitHub. */
export const GITHUB_CONNECTOR_IDS: readonly string[] = [GITHUB_PROVIDER_ID, GITHUB_APP_PROVIDER_ID];

/** Base URL for the GitHub REST API. */
export const GITHUB_API_BASE = 'https://api.github.com';

/**
 * GitHub's remote MCP server. It takes any GitHub token, so both GitHub connectors expose it, acting
 * as whoever the connection signs in as.
 */
export const GITHUB_MCP_ENDPOINT = { url: 'https://api.githubcopilot.com/mcp/', protocol: 'http' } as const;
