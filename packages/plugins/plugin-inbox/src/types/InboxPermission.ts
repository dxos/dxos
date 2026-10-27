//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Permission } from '@dxos/permission';

/**
 * Sending mail on the user's behalf. Consentable: an agent that lacks it is asked in the chat
 * rather than refused outright, since the person is there to answer.
 */
export const SendEmail: Permission.Definition = Permission.define({
  command: '/email/send',
  name: 'Send email',
  description: 'Send email from your mailbox.',
  icon: 'ph--paper-plane-tilt--regular',
  consentable: true,
});
