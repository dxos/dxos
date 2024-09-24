//
// Copyright 2023 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const EventsContainer = React.lazy(() => import('./Calendar'));
export const ContactsContainer = React.lazy(() => import('./Contacts'));
export const MailboxContainer = React.lazy(() => import('./Mailbox'));
