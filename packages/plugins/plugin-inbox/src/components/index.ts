//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './MailboxSettings';
export * from './MailboxArticle';
export * from './Related';

export const CalendarArticle = lazy(() => import('./CalendarArticle'));
export const MailboxArticle = lazy(() => import('./MailboxArticle'));
export const MessageArticle = lazy(() => import('./MessageArticle'));
export const MessageCard = lazy(() => import('./MessageCard'));
