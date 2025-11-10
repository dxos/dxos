//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './Mailbox';
export * from './PopoverSaveFilter';
export * from './Related';

export const CalendarContainer = lazy(() => import('./Calendar'));
export const MailboxContainer = lazy(() => import('./Mailbox'));
export const MessageCard = lazy(() => import('./MessageCard'));
export const MessageContainer = lazy(() => import('./MessageContainer'));
