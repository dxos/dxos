//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Icon from '@dxos/react-ui/Icon';

import { type TestCase } from '#types';

/** Icon and colour per status; `blocked` reads distinctly from `failed` because nothing was tested. */
const presentation: Record<TestCase.Status, { icon: string; classNames: string }> = {
  passed: { icon: 'ph--check-circle--regular', classNames: 'text-green-text' },
  failed: { icon: 'ph--x-circle--regular', classNames: 'text-red-text' },
  blocked: { icon: 'ph--prohibit--regular', classNames: 'text-orange-text' },
  skipped: { icon: 'ph--minus-circle--regular', classNames: 'text-fg-subtle' },
  running: { icon: 'ph--spinner--regular', classNames: 'text-blue-text' },
};

export type StatusBadgeProps = { status: TestCase.Status; label?: boolean };

export const StatusBadge = ({ status, label = true }: StatusBadgeProps) => {
  const { icon, classNames } = presentation[status];
  return (
    <span className={`flex items-center gap-1 ${classNames}`} data-testid='qa.status' data-status={status}>
      <Icon.Icon icon={icon} size='md' />
      {label && <span className='text-sm'>{status}</span>}
    </span>
  );
};

StatusBadge.displayName = 'StatusBadge';
