//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Resource } from '@dxos/protocols/proto/dxos/tracing';
import { sanitizeClassName } from '@dxos/tracing';

export const ResourceName: FC<{ className?: string; resource: Resource }> = ({ className, resource }) => (
  <span className={className}>
    {sanitizeClassName(resource.className)}
    <span className='text-neutral-400'>#{resource.instanceId}</span>
  </span>
);
