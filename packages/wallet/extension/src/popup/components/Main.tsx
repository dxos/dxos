//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';

import { useBackgroundContext } from '../contexts/BackgroundContext';
import type { Profile } from '../utils/types';
import CreateProfile from './CreateProfile';
import Import from './Import';
import Login from './Login';
import User from './User';
import Parties from './Parties';
import JoinParty from './JoinParty';

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
    <HashRouter hashType="noslash">
      <Switch>
        <Route path='/login'>
          <Login profile={profile} />
        </Route>
        <Route path='/import'>
          <Import onProfileCreated={setProfile} />
        </Route>
        <Route path='/create'>
          <CreateProfile onProfileCreated={setProfile} />
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
        <Redirect to='/login' />
      </Switch>
    </HashRouter>
  );
};

export default Main;
