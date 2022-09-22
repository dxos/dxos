//
// Copyright 2021 DXOS.org
//

import React, { FunctionComponent, ReactNode, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
  AccountCircle as AccountIcon,
  MoreVert as MoreVertIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
  Toolbar,
  Typography
} from '@mui/material';

export interface AppBarMenuOption {
  icon: FunctionComponent
  text: string
  onClick: () => Promise<void>
}

export interface AppToolbarProps {
  profile: any // TODO(burdon): Export Type from @dxos/client.
  dense?: boolean
  options?: AppBarMenuOption[]
  onToggleSidebar?: () => void
  children?: ReactNode
}

export const AppToolbar = ({
  profile,
  dense,
  options,
  onToggleSidebar,
  children
}: AppToolbarProps) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const size = dense ? 'small' : 'medium';

  const handleMenuOpen = (event: any) => {
    setAnchorEl(event?.currentTarget);
    setMenuOpen(true);
  };

  return (
    <Toolbar
      disableGutters
      variant={dense ? 'dense' : 'regular'}
      sx={{
        paddingLeft: 2,
        paddingRight: 2,
        boxSizing: 'content-box'
      }}
    >
      {onToggleSidebar && (
        <IconButton
          edge='start'
          onClick={onToggleSidebar}
          size={size}
          sx={{ marginRight: 2 }}
        >
          <MenuIcon />
        </IconButton>
      )}
      <Box sx={{
        display: 'flex',
        flexGrow: 1,
        alignItems: 'center'
      }}>
        {children}
      </Box>
      {profile?.username && (
        <Link
          component={RouterLink}
          to='/identity'
          color='inherit'
          sx={{ textDecoration: 'none' }}
        >
          <Box sx={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <Typography>{profile.username}</Typography>
            <AccountIcon className='account-icon' />
          </Box>
        </Link>
      )}
      {!profile?.username && (
        <IconButton
          size={size}
          color='inherit'
          aria-label='account-icon'
        >
          <AccountIcon className='account-icon' />
        </IconButton>
      )}
      {options && (
        <IconButton
          title='More Options'
          size={size}
          color='inherit'
          onClick={handleMenuOpen}
        >
          <MoreVertIcon />
        </IconButton>
      )}

      <Popover
        open={menuOpen}
        anchorEl={anchorEl}
        onClose={() => setMenuOpen(false)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <List dense>
          {options?.map(({ text, icon: Icon, onClick }, i) => (
            <ListItem
              button
              component='button'
              key={i}
              onClick={async () => {
                await onClick();
                setMenuOpen(false);
              }}
              title={text}
            >
              <ListItemIcon>
                <Icon />
              </ListItemIcon>
              <ListItemText primary={text} />
            </ListItem>
          ))}
        </List>
      </Popover>
    </Toolbar>
  );
};
