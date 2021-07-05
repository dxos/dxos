//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';

import type { Profile } from '../utils/types';
import Login from './Login';
import User from './User';
import Import from './Import';

const Main = () => {
  const [profile, setProfile] = useState<Profile | undefined>(undefined);

  return (
    <HashRouter hashType="noslash">
      <Switch>
        <Route path='/login'>
          <Login profile={profile} setProfile={setProfile}/>
        </Route>
        <Route path='/import'>
          <Import />
        </Route>
        {profile && profile.username && profile.publicKey ?
        <Route path='/user'>
          <User profile={profile} />
        </Route>
        : null}
        <Redirect to='/login' />
      </Switch>
    </HashRouter>
  );
}

export default Main;
