//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class FetchError extends BaseError.extend('CommerceFetchError', 'Fetch failed.') {}
