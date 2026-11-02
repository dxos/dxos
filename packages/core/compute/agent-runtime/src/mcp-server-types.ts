//
// Copyright 2026 DXOS.org
//

import * as AiContext from '@dxos/assistant/AiContext';
import { AccessToken, Connection } from '@dxos/link';

/**
 * The types `loadMcpServers` reads, for a host to declare: one registers only the types its
 * operations declare, and a typed query for any other matches nothing. A module of its own, so an
 * operation's definition can declare them without loading the agent runtime.
 */
export const mcpServerTypes = [AiContext.Binding, Connection.Connection, AccessToken.AccessToken] as const;
