//
// Copyright 2020 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';

import { Box, Divider, Typography } from '@mui/material';

import {
  CloseButton,
  FullScreen,
  OpenButton,
  SlidingAppBar,
  SlidingContent,
  SlidingDrawer,
  Toolbar
} from '../src';

export default {
  title: 'react-components/SlidingDrawer'
};

const width = 300;

const text = faker.lorem.sentence(100);

export const Left = () => {
  const [open, setOpen] = useState(true);

  return (
    <FullScreen sx={{ flexDirection: 'row' }}>
      {/* AppBar. */}
      <SlidingAppBar direction='left' drawerOpen={open} drawerWidth={width}>
        <Toolbar
          disableGutters
          variant='dense'
          sx={{ marginLeft: 1, marginRight: 1 }}
        >
          {!open && <OpenButton onOpen={() => setOpen(true)} />}
          <Typography sx={{ marginLeft: 1 }}>APPBAR</Typography>
        </Toolbar>
      </SlidingAppBar>

      {/* Main content. */}
      <SlidingContent direction='left' drawerOpen={open} drawerWidth={width}>
        <Toolbar variant='dense' />
        <Typography sx={{ padding: 2 }}>{text}</Typography>
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
          <Typography>HEADER</Typography>
          <Box sx={{ flex: 1 }} />
          <CloseButton direction='left' onClose={() => setOpen(false)} />
        </Toolbar>
        <Divider />
        <Typography sx={{ padding: 2 }}>SIDEBAR</Typography>
      </SlidingDrawer>
    </FullScreen>
  );
};

export const Right = () => {
  const [open, setOpen] = useState(true);

  return (
    <FullScreen sx={{ flexDirection: 'row' }}>
      {/* AppBar. */}
      <SlidingAppBar direction='right' drawerOpen={open} drawerWidth={width}>
        <Toolbar
          disableGutters
          variant='dense'
          sx={{ marginLeft: 2, marginRight: 1 }}
        >
          <Typography>APPBAR</Typography>
          <Box sx={{ flex: 1 }} />
          {!open && (
            <OpenButton direction='right' onOpen={() => setOpen(true)} />
          )}
        </Toolbar>
      </SlidingAppBar>

      {/* Main content. */}
      <SlidingContent direction='right' drawerOpen={open} drawerWidth={width}>
        <Toolbar variant='dense' />
        <Typography sx={{ padding: 2 }}>{text}</Typography>
      </SlidingContent>

      {/* Sidebar. */}
      <SlidingDrawer
        variant='persistent'
        direction='right'
        anchor='right'
        open={open}
        drawerWidth={width}
      >
        <Toolbar
          disableGutters
          variant='dense'
          sx={{ marginLeft: 1, marginRight: 1 }}
        >
          <CloseButton direction='right' onClose={() => setOpen(false)} />
          <Typography sx={{ marginLeft: 1 }}>HEADER</Typography>
        </Toolbar>
        <Divider />
        <Typography sx={{ padding: 2 }}>SIDEBAR</Typography>
      </SlidingDrawer>
    </FullScreen>
  );
};
