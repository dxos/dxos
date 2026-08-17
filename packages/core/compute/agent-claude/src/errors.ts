//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Failure raised by the SDK's own loop — spawn, transport, auth, or an aborted turn. */
export class AgentHostError extends BaseError.extend('AgentHostError', 'Claude agent host failure') {}
