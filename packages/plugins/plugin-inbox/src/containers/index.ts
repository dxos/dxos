//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CalendarArticle: ComponentType<any> = lazy(() => import('./CalendarArticle'));
export const DraftMessageArticle: ComponentType<any> = lazy(() => import('./DraftMessageArticle'));
export const EventArticle: ComponentType<any> = lazy(() => import('./EventArticle'));
export const EventCard: ComponentType<any> = lazy(() => import('./EventCard'));
export const MailboxArticle: ComponentType<any> = lazy(() => import('./MailboxArticle'));
export const MailboxSettings: ComponentType<any> = lazy(() => import('./MailboxSettings'));
export const MessageArticle: ComponentType<any> = lazy(() => import('./MessageArticle'));
export const MessageCard: ComponentType<any> = lazy(() => import('./MessageCard'));
export const PopoverSaveFilter: ComponentType<any> = lazy(() => import('./PopoverSaveFilter'));
export const RelatedToContact: ComponentType<any> = lazy(() => import('./RelatedToContact'));
export const RelatedToOrganization: ComponentType<any> = lazy(() => import('./RelatedToOrganization'));
