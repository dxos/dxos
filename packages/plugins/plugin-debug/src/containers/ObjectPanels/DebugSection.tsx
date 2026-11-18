//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Typography from '@dxos/react-ui/Typography';

export type DebugSectionProps = PropsWithChildren<{
  title: string;
  onRefresh?: () => void;
  refreshLabel?: string;
}>;

/** One contributed panel in the Debug companion: a title, an optional refresh, and its rows. */
export const DebugSection = ({ title, onRefresh, refreshLabel, children }: DebugSectionProps) => (
  <section className='flex flex-col gap-1 p-2'>
    <div className='flex items-center justify-between'>
      <Typography.Text classNames='font-medium'>{title}</Typography.Text>
      {onRefresh && (
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--arrows-clockwise--regular'
          label={refreshLabel}
          onClick={onRefresh}
        />
      )}
    </div>
    <dl className='grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1 text-sm'>{children}</dl>
  </section>
);

/** One label and value in a {@link DebugSection}. */
export const DebugRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
  <>
    <dt className='text-description'>{label}</dt>
    <dd className='truncate font-mono'>{value === undefined || value === '' ? '—' : String(value)}</dd>
  </>
);
