//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';

import { WithBackgroundContext } from '../contexts/BackgroundContext';
import type { Profile } from '../utils/types';
import Import from './Import';
import Login from './Login';
import User from './User';
import CreateProfile from './CreateProfile';

const Main = () => {
  const [profile, setProfile] = useState<Profile | undefined>(undefined);

  return (
    <WithBackgroundContext>
      <HashRouter hashType="noslash">
        <Switch>
          <Route path='/login'>
            <Login profile={profile} setProfile={setProfile}/>
          </Route>
          <Route path='/import'>
            <Import />
          </Route>
          <Route path='/create'>
            <CreateProfile />
          </Route>
          {profile && profile.username && profile.publicKey
            ? <Route path='/user'>
              <User profile={profile} />
            </Route>
            : null}
          <Redirect to='/login' />
        </Switch>
      </HashRouter>
    </WithBackgroundContext>
  );
};

export default Main;
