//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';

import { useBackgroundContext } from '../contexts/BackgroundContext';
import type { Profile } from '../utils/types';
import CreateProfile from './CreateProfile';
import Import from './Import';
import JoinParty from './JoinParty';
import Parties from './Parties';
import RedeemDevice from './RedeemDevice';
import User from './User';

const Main = () => {
  const [profile, setProfile] = useState<Profile | undefined>(undefined);

  const backgroundService = useBackgroundContext();

  useEffect(() => {
    if (backgroundService === undefined) {
      return;
    }

    setImmediate(async () => {
      const response = await backgroundService.rpc.GetProfile({});
      setProfile(response);
    });
  }, [backgroundService]);

  if (!backgroundService) {
    return <p>Connecting to background...</p>;
  }

  return (
    <HashRouter hashType='noslash'>
      <Switch>
        <Route path='/import'>
          <Import onProfileCreated={setProfile} />
        </Route>
        <Route path='/create'>
          <CreateProfile profile={profile} onProfileCreated={setProfile} />
        </Route>
        <Route path='/redeem-device'>
          <RedeemDevice profile={profile} onProfileCreated={setProfile} />
        </Route>
        {profile && profile.username && profile.publicKey
          ? <Switch>
            <Route path='/user'>
              <User profile={profile} />
            </Route>
            <Route path='/parties'>
              <Parties />
            </Route>
            <Route path='/joinparty'>
              <JoinParty />
            </Route>
          </Switch>
          : null}
        <Redirect to='/create' />
      </Switch>
    </HashRouter>
  );
};

export default Main;
