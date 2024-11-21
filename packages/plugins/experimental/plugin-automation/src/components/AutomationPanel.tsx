//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Button, Icon, Toolbar } from '@dxos/react-ui';

// TODO(burdon): Form components.

export const AutomationPanel = () => {
  const handleCreate = () => {};

  return (
    <div className='flex flex-col'>
      <Toolbar.Root classNames='p-2'>
        <Button onClick={handleCreate}>
          <Icon icon='ph--plus--regular' />
        </Button>
      </Toolbar.Root>
    </div>
  );
};
