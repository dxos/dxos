//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * An operation's arguments did not satisfy its contract (e.g. neither or both of a
 * mutually-exclusive pair). Typed so the failure survives the Effect error channel — these verbs
 * are projected as MCP tools, where the caller is a model that needs a legible reason.
 */
export class InvalidOperationInput extends BaseError.extend('InvalidOperationInput', 'Invalid operation input.') {}
