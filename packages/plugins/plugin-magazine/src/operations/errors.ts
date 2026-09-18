//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Fetching or extracting an article's content from its source link failed. */
export class ArticleFetchError extends BaseError.extend('ArticleFetchError', 'Failed to fetch article content.') {}
