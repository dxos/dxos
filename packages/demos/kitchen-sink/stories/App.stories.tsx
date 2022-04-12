//
// Copyright 2022 DXOS.org
//

import all from 'it-all';
import React, { useState } from 'react';
import { concat as uint8ArrayConcat } from 'uint8arrays/concat';

import { Party, InvitationDescriptor } from '@dxos/client';
import { ClientProvider, ProfileInitializer, uploadFilesToIpfs, useClient, useIpfsClient } from '@dxos/react-client';
import { TestInvitationDialog, useTestParty } from '@dxos/react-client-testing';
import { useFileDownload } from '@dxos/react-components';
import { usePartySerializer } from '@dxos/react-framework';

import {
  ONLINE_CONFIG,
  App
} from './helpers';

export default {
  title: 'KitchenSink/App'
};

/**
 * Single-player App story.
 */
export const Primary = () => {
  const Story = () => {
    const party = useTestParty();
    if (!party) {
      return null;
    }

    return (
      <App party={party} />
    );
  };

  return (
    <ClientProvider>
      <ProfileInitializer>
        <Story />
      </ProfileInitializer>
    </ClientProvider>
  );
};

/**
 * Collaborative App story.
 */
export const Secondary = () => {
  const Story = () => {
    const client = useClient();
    const [party, setParty] = useState<Party | null>();
    const testParty = useTestParty();
    const partySerializer = usePartySerializer();
    const ipfsClient = useIpfsClient('https://ipfs-pub1.kube.dxos.network');
    const download = useFileDownload();

    const handleCreateParty = async () => {
      setParty(testParty);
    };

    const handleJoinParty = async (invitationText: string) => {
      const { encodedInvitation, secret } = JSON.parse(invitationText);
      const invitation = client.echo.acceptInvitation(InvitationDescriptor.decode(encodedInvitation));
      invitation.authenticate(Buffer.from(secret));
      const party = await invitation.getParty();
      setParty(party);
    };

    const handleExport = async (ipfs?: boolean) => {
      const blob = await partySerializer.serializeParty(party!);
      if (ipfs) {
        const file = new File([blob], `${party!.key.toHex()}.party`);
        const [ipfsFile] = await uploadFilesToIpfs(ipfsClient, [file]);
        // SHOW CID
        console.log(ipfsFile);
      } else {
        download(blob, `${party!.key.toHex()}.party`);
      }
    };

    const handleImport = async (fileOrCID: File | string) => {
      let data;
      if (!(fileOrCID instanceof File)) {
        if (!ipfsClient) {
          return null;
        }
        data = uint8ArrayConcat(await all(ipfsClient.cat(fileOrCID)));
      } else {
        data = fileOrCID;
      }
      setParty(await partySerializer.deserializeParty(data));
    };

    const handleInvite = async () => {
      const invitation = await party!.createInvitation();
      const encodedInvitation = invitation.descriptor.encode();
      const text = JSON.stringify({ encodedInvitation, secret: invitation.secret.toString() });
      await navigator.clipboard.writeText(text);

      console.log(text); // Required for playwright tests.
    };

    if (party) {
      return (
        <App
          party={party}
          onInvite={handleInvite}
          onExport={handleExport}
        />
      );
    }

    return (
      <TestInvitationDialog
        open
        onCreate={handleCreateParty}
        onJoin={handleJoinParty}
        onImport={handleImport}
      />
    );
  };

  return (
    <ClientProvider config={ONLINE_CONFIG}>
      <ProfileInitializer>
        <Story />
      </ProfileInitializer>
    </ClientProvider>
  );
};
