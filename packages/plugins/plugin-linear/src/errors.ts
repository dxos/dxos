//
// Copyright 2026 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { BaseError } from '@dxos/errors';

/** Linear GraphQL replied 200 OK with a non-empty `errors` array. */
export class LinearGraphQLError extends BaseError.extend('LinearGraphQLError', 'Linear GraphQL request failed.') {}

/** User-facing diagnostic string for failures from Linear sync paths. */
export const formatLinearSyncFailure = (error: unknown): string => {
  if (error instanceof BaseError) {
    const keys = Object.keys(error.context);
    return keys.length > 0 ? `${error.name}: ${JSON.stringify(error.context)}` : error.name;
  }
  if (Predicate.isRecord(error) && typeof error._tag === 'string') {
    if (
      error._tag === 'ResponseError' &&
      Predicate.isRecord(error.response) &&
      typeof error.response.status === 'number'
    ) {
      return `HTTP ${error.response.status}`;
    }
    return error._tag;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
