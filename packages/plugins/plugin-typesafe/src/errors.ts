//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** No TypeSafe API key is connected in this space, so no question can be asked. */
export class MissingCredentialError extends BaseError.extend(
  'MissingCredentialError',
  'TypeSafe is not connected in this space',
) {
  constructor(options?: { readonly cause?: unknown }) {
    super({ context: { source: 'typesafe.ai' }, cause: options?.cause });
  }
}
