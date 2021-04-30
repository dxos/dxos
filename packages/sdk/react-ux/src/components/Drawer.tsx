//
// Copyright 2020 DXOS.org
//

import clsx from 'clsx';
import React from 'react';

import Drawer from '@material-ui/core/Drawer';
import { makeStyles, Theme } from '@material-ui/core/styles';

const DRAWER_WIDTH = 300;

const useStyles = makeStyles((theme: Theme) => {
  return {
    root: {
      display: 'flex',
      flexDirection: 'row',
      flex: 1,
      overflow: 'hidden'
    },

    drawer: {
      width: 0,
      transition: `width ${theme.transitions.duration.enteringScreen}ms ${theme.transitions.easing.easeOut} 0ms`
    },

    drawerOpen: ({ width }: any) => ({
      width,
      transition: `width ${theme.transitions.duration.leavingScreen}ms ${theme.transitions.easing.sharp} 0ms`
    }),

    drawerPaper: () => ({
      position: 'inherit'
    }),

    content: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      width: '100%'
    }
  };
});

const DrawerBase = ({
  open,
  position,
  component,
  width = DRAWER_WIDTH,
  children
}: {
  open: boolean,
  position?: 'left' | 'top' | 'right' | 'bottom',
  component: React.ReactNode,
  width: number,
  children: React.ReactNode
}) => {
  const classes = useStyles({ width, open });

  const left = position === 'left';
  const right = position === 'right';

  const content = (
    <div className={classes.content}>
      {children}
    </div>
  );

  const drawer = (
    <Drawer
      className={clsx(
        classes.drawer,
        {
          [classes.drawerOpen]: open
        }
      )}
      classes={{ paper: classes.drawerPaper }}
      open={open}
      anchor={position}
      variant='persistent'
    >
      {component}
    </Drawer>
  );

  return (
    <div className={classes.root}>
      {left && drawer}
      {content}
      {right && drawer}
    </div>
  );
};

/**
 * Left-side drawer.
 */
export const LeftDrawer = (
  props: {
    open: boolean,
    position?: 'left' | 'top' | 'right' | 'bottom',
    component: React.ReactNode,
    width: number,
    children: React.ReactNode
  }
) => {
  return (
    <DrawerBase
      {...props}
      position='left'
    />
  );
};

/**
 * Right-side drawer.
 */
export const RightDrawer = (
  props: {
    open: boolean,
    position?: 'left' | 'top' | 'right' | 'bottom',
    component: React.ReactNode,
    width: number,
    children: React.ReactNode
  }
) => {
  return (
    <DrawerBase
      {...props}
      position='right'
    />
  );
};
