//
// Copyright 2026 DXOS.org
//

import { type ResponsePass, SERVER_INSTRUCTIONS, isRecord, resultOf, withIdentity } from './response-pass.ts';

/**
 * Decorates an `initialize` result, which names the server in its top-level `serverInfo`.
 *
 * TODO(wittjosiah): Remove when every DXOS MCP server drops 2025-era MCP support.
 */
export const decorateInitializeResult: ResponsePass = (message, options) => {
  const result = resultOf(message);
  const serverInfo: unknown = result?.serverInfo;
  if (result == null || !isRecord(serverInfo)) {
    return false;
  }
  result.serverInfo = withIdentity(serverInfo, options);
  result.instructions ??= options.instructions ?? SERVER_INSTRUCTIONS;
  return true;
};
