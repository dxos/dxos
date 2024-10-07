//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';

import { Calls } from './Calls';
import '../styles/tailwind.css';

const CallsContainer = ({ space, role }: { space: Space; role?: string }) => {
  if (!space) {
    return null;
  }

  return (
    <div role='none' className='flex flex-col row-span-2 is-full overflow-hidden'>
      <Calls roomName={space.id.slice(10)} />
    </div>
  );
};

export default CallsContainer;
