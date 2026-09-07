//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** No DeepSeek credential is stored in the space, so the harness has nothing to authenticate with. */
export class MissingCredentialError extends BaseError.extend(
  'MissingCredentialError',
  'No DeepSeek API credential is connected in this space.',
) {}

/** Installing the harness CLI into the sandbox failed, so there is nothing to run. */
export class HarnessInstallError extends BaseError.extend(
  'HarnessInstallError',
  'The DeepSeek harness could not be installed in the sandbox.',
) {}
