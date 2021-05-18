//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { JsonTreeView } from '@dxos/react-ux';

import { schema } from '../../proto/gen';
import { useBackground } from '../hooks';

const Application = () => {
  const [profile, setProfile] = useState<any | undefined>();
  const background = useBackground();

  useEffect(() => {
    if (background === undefined) {
      return;
    }

    const listener = (message: any) => {
      const decodedMessage = schema.getCodecForType('dxos.wallet.extension.ProfileResponse').decode(message);
      console.log('Popup received: ', decodedMessage);
      setProfile(decodedMessage);
    };
    background.onMessage.addListener(listener);
    background.postMessage({ method: 'GetProfile' });
    return () => background.onMessage.removeListener(listener);
  }, [background]);

  if (!profile) {
    return <p>No profile loaded.</p>;
  }

  return (
    <div style={{ minWidth: 400 }}>
      <JsonTreeView data={profile} />
    </div>
  );
};

export default Application;
