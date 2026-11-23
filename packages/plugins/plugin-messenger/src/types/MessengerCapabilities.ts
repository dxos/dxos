//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { MessengerNamespace } from '../namespace.ts';
import * as Notifications from './Notifications.ts';

/**
 * The default space's notifications containers, the one every device writes to first; more than one
 * only until the materializer converges them, so readers union all of them.
 */
export const NotificationsContainers = Capability.makeSingleton<Atom.Atom<readonly Notifications.Notifications[]>>()(
  `${MessengerNamespace.key}.capability.notificationsContainers`,
);
