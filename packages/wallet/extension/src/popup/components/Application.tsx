//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { JsonTreeView } from '@dxos/react-ux';

import { schema } from '../../proto/gen';
import { useBackground } from '../hooks';

const getProfileRequest = schema.getCodecForType('dxos.wallet.extension.RequestEnvelope').encode({ req1: { requestId: '123' } });
const getPartiesRequest = schema.getCodecForType('dxos.wallet.extension.RequestEnvelope').encode({ req3: { requestId: '123' } });

const Application = () => {
  const [profile, setProfile] = useState<any | undefined>(undefined);
  const [parties, setParties] = useState<any[] | undefined>(undefined);
  const background = useBackground();

  useEffect(() => {
    if (background === undefined) {
      return;
    }

    const listener = (message: any) => {
      if (message?.type !== 'Buffer') {
        console.log('Unsupported response.', { message });
        return;
      }
      try {
        const responseEnvelope = schema.getCodecForType('dxos.wallet.extension.ResponseEnvelope').decode(message.data);
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
      } catch (error) {
        console.error('Failed to process a response.');
        console.log({ error, message });
      }
    };
    background.onMessage.addListener(listener);

    console.log('Sending', { getProfileRequest, getPartiesRequest });
    background.postMessage(getProfileRequest);
    background.postMessage(getPartiesRequest);

    return () => background.onMessage.removeListener(listener);
  }, [background]);

  if (!profile) {
    return <p>No profile loaded.</p>;
  }

  return (
    <div style={{ minWidth: 400 }}>
      <JsonTreeView data={profile} />
      <p>Number of parties: {parties?.length ?? 0}.</p>
      <button onClick={async () => {
        const createParty = schema.getCodecForType('dxos.wallet.extension.RequestEnvelope').encode({ req2: { requestId: '123' } });
        background?.postMessage(createParty);
        background?.postMessage(getPartiesRequest);
      }}>Create party</button>
      <button onClick={() => background?.postMessage(getPartiesRequest)}>Refresh</button>
    </div>
  );
};

export default Application;
