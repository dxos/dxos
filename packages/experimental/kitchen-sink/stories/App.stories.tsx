//
// Copyright 2022 DXOS.org
//

import all from 'it-all';
import React, { useState } from 'react';
import { concat as uint8ArrayConcat } from 'uint8arrays/concat';

import { Snackbar } from '@mui/material';

import { InvitationDescriptor, Party } from '@dxos/client';
import { PartyBuilder, buildTestParty } from '@dxos/client-testing';
import { ClientProvider, useClient } from '@dxos/react-client';
import {
  CreatePartyDialog,
  ExportAction,
  ProfileInitializer,
  useTestParty
} from '@dxos/react-client-testing';
import { useFileDownload } from '@dxos/react-components';
import { uploadFilesToIpfs, useIpfsClient } from '@dxos/react-ipfs';
import { usePartySerializer } from '@dxos/react-toolkit';

import { App } from '../src';
// TODO(burdon): Lint issue.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../src/config.yml';

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

    return <App party={party} />;
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
    const [snackbarMessage, setSnackbarMessage] = useState<
      string | undefined
    >();
    const partySerializer = usePartySerializer();
    const ipfsClient = useIpfsClient(
      client.config.get('runtime.services.ipfs.server')
    );
    const download = useFileDownload();

    const handleCreateParty = async () => {
      const party = await client.echo.createParty();
      const builder = new PartyBuilder(party);
      await buildTestParty(builder);
      setParty(party);
    };

    const handleJoinParty = async (invitationText: string) => {
      const { encodedInvitation, secret } = JSON.parse(invitationText);
      const invitation = client.echo.acceptInvitation(
        InvitationDescriptor.decode(encodedInvitation)
      );
      invitation.authenticate(Buffer.from(secret));
      const party = await invitation.getParty();
      setParty(party);
    };

    const handleExportParty = async (action: ExportAction) => {
      const blob = await partySerializer.serializeParty(party!);
      switch (action) {
        case ExportAction.EXPORT_IPFS: {
          const file = new File([blob], `${party!.key.toHex()}.party`);
          const [ipfsFile] = await uploadFilesToIpfs(ipfsClient!, [file]);
          if (ipfsFile) {
            await navigator.clipboard.writeText(ipfsFile.cid);
            setSnackbarMessage('CID copied to clipbaord.');
          }
          break;
        }

        case ExportAction.EXPORT_FILE: {
          download(blob, `${party!.key.toHex()}.party`);
          break;
        }
      }
    };

    const handleImportParty = async (fileOrCID: File | string) => {
      let data;
      if (fileOrCID instanceof File) {
        data = await new Uint8Array(await fileOrCID.arrayBuffer());
      } else {
        // TODO(burdon): Why not Promise.all? Wrap in util?
        data = uint8ArrayConcat(await all(ipfsClient!.cat(fileOrCID)));
      }

      setParty(await partySerializer.deserializeParty(data));
    };

    const handleInviteParty = async () => {
      const invitation = await party!.createInvitation();
      const encodedInvitation = invitation.descriptor.encode();
      const text = JSON.stringify({
        encodedInvitation,
        secret: invitation.secret.toString()
      });
      await navigator.clipboard.writeText(text);
      console.log(text); // Required for playwright tests.
    };

    if (party) {
      return (
        <>
          <App
            party={party}
            onInvite={handleInviteParty}
            onExport={handleExportParty}
          />

          <Snackbar
            open={Boolean(snackbarMessage)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            autoHideDuration={1000}
            message={snackbarMessage}
            onClose={() => setSnackbarMessage(undefined)}
          />
        </>
      );
    }

    return (
      <CreatePartyDialog
        open
        onCreate={handleCreateParty}
        onJoin={handleJoinParty}
        onImport={handleImportParty}
      />
    );
  };

  return (
    <ClientProvider config={config}>
      <ProfileInitializer>
        <Story />
      </ProfileInitializer>
    </ClientProvider>
  );
};
