//
// Copyright 2025 DXOS.org
//

// Presentational component showing the active space name.
// Extracted from the deck companion so it can be tested independently.

import React from 'react';

import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

export type ActiveSpacePanelProps = {
  spaceName?: string;
};

export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {
  return (
    <Layout.Flex column gap='sm' classNames='p-4'>
      <h3 className='text-sm font-medium'>Sample Panel</h3>
      <p className='text-sm text-fg-muted'>
        This is a workspace-wide deck companion. It is always available regardless of which object is focused.
      </p>
      {spaceName && (
        <Layout.Flex align='center' gap='sm' classNames='text-sm'>
          <span className='text-fg-muted'>Active space:</span>
          <Tag.Tag hue='neutral'>{spaceName}</Tag.Tag>
        </Layout.Flex>
      )}
    </Layout.Flex>
  );
};
