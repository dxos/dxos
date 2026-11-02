//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import { AssistantNamespace } from './namespace.ts';
/** Stable id used by `plugin-connector` to look up the Anthropic provider entry. */
export const ANTHROPIC_PROVIDER_ID = 'anthropic';

/** Source string used in `AccessToken.source` and matched by `Header.byokLayer('anthropic.com')`. */
export const ANTHROPIC_SOURCE = 'anthropic.com';

/** Stable id used by `plugin-connector` to look up the DeepSeek provider entry. */
export const DEEPSEEK_PROVIDER_ID = 'deepseek';

/** Source string used in `AccessToken.source` for a user-supplied DeepSeek key. */
export const DEEPSEEK_SOURCE = 'deepseek.com';

/** Stable id of the Custom MCP Server connector; stored as `Connection.connectorId`. */
export const MCP_PROVIDER_ID = 'mcp';

/** Registry key of the built-in MCP server behind the Browser skill. */
export const BROWSER_MCP_KEY = 'org.dxos.mcp.browser';

/** The hosted Playwright MCP server behind the Browser skill. */
// https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/workers/services/view/playwright-mcp-example/production
export const BROWSER_MCP_ENDPOINT = {
  url: 'https://playwright-mcp-example.dxos.workers.dev/sse',
  protocol: 'sse',
} as const;

export const ASSISTANT_DIALOG = DXN.make(`${AssistantNamespace.key}.assistantDialog`);

/** Companion variant identifier for the assistant chat panel. */
export const ASSISTANT_COMPANION_VARIANT = 'assistant-chat';

/** Segment of the assistant panel within a space's settings section. */
export const SPACE_SETTINGS_ID = 'assistant';

/** Node type, and surface data, of the assistant panel within a space's settings section. */
export const SPACE_SETTINGS_TYPE = `${AssistantNamespace.key}.space-settings`;
