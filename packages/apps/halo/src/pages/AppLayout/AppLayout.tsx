//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { FormControlLabel, Switch, Tab, Tabs } from '@mui/material';

import { useProfile } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { AppToolbar } from './AppToolbar';

const tabs = [
  {
    label: 'Spaces',
    url: '/spaces'
  },
  {
    label: 'Devices',
    url: '/devices'
  },
  {
    label: 'Identity',
    url: '/identity'
  }
];

export const AppLayout = () => {
  // DXOS
  const profile = useProfile(true);
  const location = useLocation();
  const tab = useMemo(() => tabs.findIndex(tab => location.pathname.startsWith(tab.url)), [location]);

  // React Router
  const navigate = useNavigate();

  const handleLock = useCallback(() => {
    navigate('/');
  }, []);

  return (
    <FullScreen>
      <AppToolbar
        dense
        profile={profile}
      >
        <FormControlLabel
          control={<Switch defaultChecked />}
          label='🔓️'
          onChange={handleLock}
        />
      </AppToolbar>

      <Tabs
        value={tab}
        onChange={(event, newValue) => navigate(tabs[newValue].url)}
      >
        {tabs.map(({ label }) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>
      <Outlet />
    </FullScreen>
  );
};
