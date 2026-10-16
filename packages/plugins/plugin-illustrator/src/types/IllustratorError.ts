//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { BaseError } from '@dxos/errors';

/** The layout engine (ELK) rejected the diagram; the cause carries its message. */
export class LayoutFailed extends BaseError.extend('IllustratorLayoutFailed', 'Diagram layout failed') {}

/** A drawing was asked to convert to the variant it already uses. */
export class SameVariant extends BaseError.extend('IllustratorSameVariant', 'Drawing already uses this variant') {}

export type IllustratorError = LayoutFailed | SameVariant;
