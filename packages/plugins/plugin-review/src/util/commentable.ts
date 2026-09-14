//
// Copyright 2026 DXOS.org
//

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Entity, Obj } from '@dxos/echo';
import { Channel } from '@dxos/types';

/** The comment config for `data` when it is an object whose type takes comments; Channels never do. */
export const getCommentConfig = (
  capabilities: CapabilityManager.CapabilityManager,
  data: unknown,
): AppCapabilities.CommentConfig | undefined => {
  if (!Obj.isObject(data) || Entity.instanceOf(Channel.Channel, data)) {
    return undefined;
  }

  const typename = Obj.getTypename(data);
  return capabilities.getAll(AppCapabilities.CommentConfig).find(({ id }) => id === typename);
};
