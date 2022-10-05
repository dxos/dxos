//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { Construction as ExampleIcon, BugReport as TestIcon } from '@mui/icons-material';
import { Box, Button, Drawer } from '@mui/material';

import { AppToolbar } from './AppToolbar';

export default {
  title: 'react-appkit/AppLayout/AppToolbar'
};

export const Primary = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HashRouter>
      <Box>
        <AppToolbar
          profile={{ username: 'test-user' }}
          dense
          options={[
            {
              icon: TestIcon,
              text: 'Test',
              onClick: async () => console.log('Test')
            },
            {
              icon: ExampleIcon,
              text: 'Example',
              onClick: async () => console.log('Example')
            }
          ]}
          onToggleSidebar={() => setSidebarOpen(true)}
        />
        <Drawer
          variant='persistent'
          open={sidebarOpen}
          sx={{
            width: 300,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: 300, boxSizing: 'border-box' }
          }}
        >
          <Button onClick={() => setSidebarOpen(false)}>Close</Button>
        </Drawer>
      </Box>
    </HashRouter>
  );
};
