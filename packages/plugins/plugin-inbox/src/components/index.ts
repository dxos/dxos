//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const EventsContainer = lazy(() => import('./Calendar'));
export const MailboxContainer = lazy(() => import('./Mailbox'));
export { MailboxObjectSettings } from './Mailbox';
export const MessageContainer = lazy(() => import('./MessageContainer'));
export const MessageCard = lazy(() => import('./MessageCard'));
