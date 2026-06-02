//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const NotificationsSettings = Capability.lazy('NotificationsSettings', () => import('./settings'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const NotificationsLifecycle = Capability.lazy('NotificationsLifecycle', () => import('./notifications-lifecycle'));
