//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';

/**
 * Command annotation: the host must not wait for the client before running this command (or any
 * command under it). A command so marked that still needs the client on some path resolves it with
 * `initializedClient` from `@dxos/client`.
 */
export const ClientFree = Context.Reference<boolean>('@dxos/cli-util/ClientFree', { defaultValue: () => false });
