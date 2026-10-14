//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** The connector form was submitted without a usable API key. */
export class MissingApiKeyError extends BaseError.extend(
  'MissingApiKeyError',
  'TypeSafe connection requires an API key',
) {}
