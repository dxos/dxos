//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Assistant operation failed. The underlying failure, where there is one, is the `cause`. */
export class AssistantOperationError extends BaseError.extend(
  'AssistantOperationError',
  'Assistant operation failed.',
) {}

/** A BYOK provider rejected the API key the credential form submitted. */
export class ConnectorKeyInvalidError extends BaseError.extend(
  'ConnectorKeyInvalidError',
  'The provider rejected this API key.',
) {}

/** A custom MCP server could not be reached, or failed for a reason other than its credentials. */
export class McpServerUnavailableError extends BaseError.extend(
  'McpServerUnavailableError',
  'The MCP server could not be reached.',
) {}
