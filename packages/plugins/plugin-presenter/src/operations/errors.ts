//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Rejects input the assistant can correct, e.g. an object that cannot be presented. */
export class PresenterOperationError extends BaseError.extend(
  'PresenterOperationError',
  'Presenter operation failed.',
) {}
