//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';

import { type TestCase } from '#types';

/** Icon and colour per status; `blocked` reads distinctly from `failed` because nothing was tested. */
const presentation: Record<TestCase.Status, { icon: string; classNames: string }> = {
  passed: { icon: 'ph--check-circle--regular', classNames: 'text-greenText' },
  failed: { icon: 'ph--x-circle--regular', classNames: 'text-redText' },
  blocked: { icon: 'ph--prohibit--regular', classNames: 'text-orangeText' },
  skipped: { icon: 'ph--minus-circle--regular', classNames: 'text-subdued' },
  running: { icon: 'ph--spinner--regular', classNames: 'text-blueText' },
};

export type StatusBadgeProps = { status: TestCase.Status; label?: boolean };

export const StatusBadge = ({ status, label = true }: StatusBadgeProps) => {
  const { icon, classNames } = presentation[status];
  return (
    <span className={`flex items-center gap-1 ${classNames}`} data-testid='qa.status' data-status={status}>
      <Icon icon={icon} size={4} />
      {label && <span className='text-sm'>{status}</span>}
    </span>
  );
};

StatusBadge.displayName = 'StatusBadge';
