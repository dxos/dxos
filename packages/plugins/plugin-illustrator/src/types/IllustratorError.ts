//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { BaseError } from '@dxos/errors';

/** The layout engine (ELK) rejected the diagram; the cause carries its message. */
export class LayoutFailed extends BaseError.extend('IllustratorLayoutFailed', 'Diagram layout failed') {}

export type IllustratorError = LayoutFailed;
