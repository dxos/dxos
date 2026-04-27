//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CalendarArticle: ComponentType<any> = lazy(() => import('./CalendarArticle'));
export const CalendarProperties: ComponentType<any> = lazy(() => import('./CalendarProperties'));
export const DraftsArticle: ComponentType<any> = lazy(() => import('./DraftsArticle'));
export const EditMessageArticle: ComponentType<any> = lazy(() => import('./EditMessageArticle'));
export const EventArticle: ComponentType<any> = lazy(() => import('./EventArticle'));
export const EventCard: ComponentType<any> = lazy(() => import('./EventCard'));
export const MailboxArticle: ComponentType<any> = lazy(() => import('./MailboxArticle'));
export const MailboxProperties: ComponentType<any> = lazy(() => import('./MailboxProperties'));
export const MessageArticle: ComponentType<any> = lazy(() => import('./MessageArticle'));
export const MessageCard: ComponentType<any> = lazy(() => import('./MessageCard'));
export const SaveFilterPopover: ComponentType<any> = lazy(() => import('./SaveFilterPopover'));
export const RelatedToContact: ComponentType<any> = lazy(() => import('./RelatedToContact'));
export const RelatedToOrganization: ComponentType<any> = lazy(() => import('./RelatedToOrganization'));
