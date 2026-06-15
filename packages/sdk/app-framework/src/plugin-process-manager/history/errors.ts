//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class EmptyHistoryError extends BaseError.extend('EmptyHistoryError', 'Cannot undo: history is empty.') {}
