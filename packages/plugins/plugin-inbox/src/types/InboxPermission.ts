//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * Sending mail on the user's behalf. Consentable: an agent that lacks it is asked in the chat
 * rather than refused outright, since the person is there to answer.
 *
 * Plain data in the `@dxos/permission` vocabulary, since that package is private and this one is published.
 */
export const SendEmail = {
  command: '/email/send',
  name: 'Send email',
  description: 'Send email from your mailbox.',
  icon: 'ph--paper-plane-tilt--regular',
  consentable: true,
} as const;

/** What an operation that sends mail declares through `Operation.RequiresAnnotation`. */
export const SendEmailRequirement = { command: SendEmail.command, consentable: SendEmail.consentable } as const;
