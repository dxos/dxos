//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Resource } from '@dxos/protocols/proto/dxos/tracing';

export const ResourceName: FC<{ className?: string; resource: Resource }> = ({ className, resource }) => (
  <span className={className}>
    {sanitizeClassName(resource.className)}
    <span className='text-gray-400'>#{resource.instanceId}</span>
  </span>
);

const sanitizeClassName = (className: string) => {
  const SANITIZE_REGEX = /[^_](\d+)$/;
  const m = className.match(SANITIZE_REGEX);
  if (!m) {
    return className;
  } else {
    return className.slice(0, -m[1].length);
  }
};
