//
// Copyright 2021 DXOS.org
//

import React, { FunctionComponent, PropsWithChildren } from 'react';

import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import {
  AppBar as MuiAppBar,
  AppBarProps as MuiAppBarProps,
  Drawer as MuiDrawer,
  DrawerProps as MuiDrawerProps,
  IconButton,
  styled
} from '@mui/material';

// TODO(zarco): Add mobile adjustments so the drawer goes on top of the content.

type Direction = 'left' | 'right';

// ----------------------------------------------------------------------------.
// Drawer.
// https://mui.com/components/drawers/#persistent-drawer
// ----------------------------------------------------------------------------.

interface SlidingDrawerProps extends MuiDrawerProps {
  direction?: Direction;
  drawerWidth: number;
}

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== 'direction' && prop !== 'drawerWidth'
})<SlidingDrawerProps>(({ theme, direction, drawerWidth, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  position: 'absolute',
  top: 0,
  bottom: 0,
  overflow: 'hidden',
  pointerEvents: open ? 'auto' : 'none',
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'content-box',
    overflow: 'hidden',
    border: 'none',
    borderRight:
      direction === 'left' ? `1px solid ${theme.palette.divider}` : undefined,
    borderLeft:
      direction === 'right' ? `1px solid ${theme.palette.divider}` : undefined
  }
}));

export const SlidingDrawer: FunctionComponent<SlidingDrawerProps> = Drawer;

// ----------------------------------------------------------------------------.
// AppBar.
// NOTE: AppBar is separate from the main panel to enable flexible mobile layout.
// ----------------------------------------------------------------------------.

export interface AppBarProps extends MuiAppBarProps {
  direction?: Direction;
  drawerOpen: boolean;
  drawerWidth: number;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) =>
    prop !== 'direction' && prop !== 'drawerOpen' && prop !== 'drawerWidth'
})<AppBarProps>(({ theme, direction = 'left', drawerOpen, drawerWidth }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  marginLeft: 0,
  marginRight: 0,
  ...(drawerOpen && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: direction === 'left' ? `${drawerWidth}px` : undefined,
    marginRight: direction === 'right' ? drawerWidth : undefined,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen
    })
  })
}));

export const SlidingAppBar: FunctionComponent<AppBarProps> = AppBar;

// ----------------------------------------------------------------------------.
// Content.
// NOTE: Outer container must set `{ flex-direction: 'row' }`.
// ----------------------------------------------------------------------------.

interface ContentProps {
  direction?: Direction;
  drawerOpen: boolean;
  drawerWidth: number;
}

const Content = styled('main', {
  shouldForwardProp: (prop) =>
    prop !== 'direction' && prop !== 'drawerOpen' && prop !== 'drawerWidth'
})<ContentProps>(({ theme, direction = 'left', drawerOpen, drawerWidth }) => ({
  display: 'flex',
  overflow: 'hidden',
  flexGrow: 1,
  flexDirection: 'column',
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  marginLeft: 0,
  marginRight: 0,
  ...(drawerOpen && {
    marginLeft: direction === 'left' ? `${drawerWidth}px` : undefined,
    marginRight: direction === 'right' ? `${drawerWidth}px` : undefined,
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen
    })
  })
}));

export const SlidingContent: FunctionComponent<
  PropsWithChildren<ContentProps>
> = Content;

// ----------------------------------------------------------------------------.
// Helpers.
// ----------------------------------------------------------------------------.

interface CloseButtonProps {
  direction?: Direction;
  onClose: () => void;
}

export const CloseButton = ({
  direction = 'left',
  onClose,
  ...props
}: CloseButtonProps) => (
  <IconButton
    size='small'
    aria-label='close drawer'
    onClick={() => onClose()}
    {...props}
  >
    {direction === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
  </IconButton>
);

export interface OpenButtonProps {
  direction?: Direction;
  onOpen: () => void;
  sx?: any;
}

export const OpenButton = ({
  direction = 'left',
  onOpen,
  ...props
}: OpenButtonProps) => (
  <IconButton
    size='small'
    aria-label='open drawer'
    onClick={() => onOpen()}
    {...props}
  >
    {direction === 'left' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
  </IconButton>
);
