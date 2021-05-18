//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { JsonTreeView } from '@dxos/react-ux';

import { schema } from '../../proto/gen';
import { useBackground } from '../hooks';

const Application = () => {
  const [profile, setProfile] = useState<any | undefined>(undefined);
  const [parties, setParties] = useState<any[] | undefined>(undefined);
  const background = useBackground();

  useEffect(() => {
    if (background === undefined) {
      return;
    }

    const listener = (message: any) => {
      const responseEnvelope = schema.getCodecForType('dxos.wallet.extension.ResponseEnvelope').decode(message);
      console.log('Received response', { message, responseEnvelope });
      if (responseEnvelope.res1) {
        setProfile(responseEnvelope.res1);
      } else if (responseEnvelope.res2) {
        console.log('Party created.');
      } else if (responseEnvelope.res3) {
        setParties(responseEnvelope.res3.partyKeys);
      } else {
        console.log('Unsupported response.', { responseEnvelope, message });
      }
    };
    background.onMessage.addListener(listener);

    const getProfileRequest = schema.getCodecForType('dxos.wallet.extension.RequestEnvelope').encode({ req1: { requestId: '123' } });
    console.log('Sending', { getProfileRequest });
    background.postMessage(getProfileRequest);
    return () => background.onMessage.removeListener(listener);
  }, [background]);

  if (!profile) {
    return <p>No profile loaded.</p>;
  }

  return (
    <div style={{ minWidth: 400 }}>
      <JsonTreeView data={profile} />
      <p>There are {parties?.length ?? 0} parties</p>
    </div>
  );
};

export default Application;
