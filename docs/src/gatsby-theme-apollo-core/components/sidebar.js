//
// Copyright 2020 DXOS.org
//

import React from 'react';
import SharedSidebar from '@dxos/docs-theme/dist/src/components/Sidebar';
import Logo from './logo';

const Sidebar = props =>
  <SharedSidebar {...props} logo={<Logo />}>
    {props.children}
  </SharedSidebar>;

export default Sidebar;
