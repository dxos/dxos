//
// Copyright 2022 DXOS.org
//

import React, { useState, ReactNode } from 'react';

import { Box, Typography } from '@mui/material';

import {
  CloseButton,
  OpenButton,
  SlidingAppBar,
  SlidingContent,
  SlidingDrawer,
  Toolbar
} from '@dxos/react-components';

export interface LayoutProps {
  children?: ReactNode;
  title?: string;
  sidebar?: ReactNode;
  width?: number;
}

export const Layout = ({
  children,
  title = 'Kitchen Sink',
  sidebar,
  width = 500
}: LayoutProps) => {
  const [open, setOpen] = useState(true);

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1
      }}
    >
      <SlidingAppBar direction='left' drawerOpen={open} drawerWidth={width}>
        <Toolbar
          disableGutters
          variant='dense'
          sx={{ marginLeft: 1, marginRight: 1 }}
        >
          {!open && <OpenButton onOpen={() => setOpen(true)} />}
          <Typography>{title}</Typography>
        </Toolbar>
      </SlidingAppBar>

      {/* Main content. */}
      <SlidingContent direction='left' drawerOpen={open} drawerWidth={width}>
        <Toolbar variant='dense' />
        {children}
      </SlidingContent>

      {/* Sidebar. */}
      <SlidingDrawer
        variant='persistent'
        direction='left'
        anchor='left'
        open={open}
        drawerWidth={width}
      >
        <Toolbar
          disableGutters
          variant='dense'
          sx={{ marginLeft: 2, marginRight: 1 }}
        >
          <CloseButton direction='left' onClose={() => setOpen(false)} />
        </Toolbar>
        {sidebar}
      </SlidingDrawer>
    </Box>
  );
};
