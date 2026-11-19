//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';

export type DebugSectionProps = PropsWithChildren<{
  title: string;
  onRefresh?: () => void;
  refreshLabel?: string;
}>;

/** One contributed panel in the Debug companion: a title, an optional refresh, and its rows. */
export const DebugSection = ({ title, onRefresh, refreshLabel, children }: DebugSectionProps) => (
  <Layout.Flex column gap='xs' classNames='p-2' asChild>
    <section>
      <Layout.Flex align='center' justify='between'>
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
      </Layout.Flex>
      <Layout.Grid cols={['min', 'fill']} gap='sm' classNames='text-sm' asChild>
        <dl>{children}</dl>
      </Layout.Grid>
    </section>
  </Layout.Flex>
);

/** One label and value in a {@link DebugSection}. */
export const DebugRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
  <>
    <dt className='text-description'>{label}</dt>
    <dd className='truncate font-mono'>{value === undefined || value === '' ? '—' : String(value)}</dd>
  </>
);
