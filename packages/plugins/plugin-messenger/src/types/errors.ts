//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';
import { type InboxPayloadTooLargeError } from '@dxos/protocols';

/** The recipient is not a contact, so there is no identity key to address the message to. */
export class UnknownRecipientError extends BaseError.extend(
  'UnknownRecipientError',
  'The recipient is not one of your contacts.',
) {}

/** The relay did not accept the message (e.g., EDGE is unreachable or the sender is rate limited). */
export class MessageSendError extends BaseError.extend('MessageSendError', 'The message could not be sent.') {}

/** Failures of `MessengerCapabilities.Sender.send`. */
export type InboxSendError = UnknownRecipientError | MessageSendError | InboxPayloadTooLargeError;

/** A notification links to an object in a space this identity is not a member of, or that no longer exists. */
export class LinkUnavailableError extends BaseError.extend(
  'LinkUnavailableError',
  'The linked object is not available.',
) {}
