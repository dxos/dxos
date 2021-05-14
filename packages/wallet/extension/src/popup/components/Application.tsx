//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';
import { hot } from 'react-hot-loader';
import { JsonTreeView } from '@dxos/react-ux';

import { browser } from "webextension-polyfill-ts";

const Application = () => {
  const [profile, setProfile] = useState<any | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const result = await browser.runtime.sendMessage({method: 'GetProfile'})
      console.log('Received', result)
      setProfile(result);
    })
  }, [])

  if (!profile) {
    return <p>No profile loaded.</p>;
  }

  return (
    <div style={{minWidth: 400}}>
      <JsonTreeView data={profile} />
    </div>
  );
};

export default hot(module)(Application);
