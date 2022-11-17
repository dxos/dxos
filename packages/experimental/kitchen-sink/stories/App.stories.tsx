//
// Copyright 2022 DXOS.org
//

import all from 'it-all';
import React, { useState } from 'react';
import { concat as uint8ArrayConcat } from 'uint8arrays/concat';

import { Snackbar } from '@mui/material';

import { InvitationEncoder, Space } from '@dxos/client';
import { SpaceBuilder, buildTestSpace } from '@dxos/client-testing';
import { ClientProvider, useClient } from '@dxos/react-client';
import { CreateSpaceDialog, ExportAction, ProfileInitializer, useTestSpace } from '@dxos/react-client-testing';
import { useFileDownload } from '@dxos/react-components';
import { uploadFilesToIpfs, useIpfsClient } from '@dxos/react-ipfs';
import { useSpaceSerializer } from '@dxos/react-toolkit';

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
    const space = useTestSpace();
    if (!space) {
      return null;
    }

    return <App space={space} />;
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
    const [space, setSpace] = useState<Space | null>();
    const [snackbarMessage, setSnackbarMessage] = useState<string | undefined>();
    const spaceSerializer = useSpaceSerializer();
    const ipfsClient = useIpfsClient(client.config.get('runtime.services.ipfs.server'));
    const download = useFileDownload();

    const handleCreateSpace = async () => {
      const space = await client.echo.createSpace();
      const builder = new SpaceBuilder(space);
      await buildTestSpace(builder);
      setSpace(space);
    };

    const handleJoinSpace = async (invitationText: string) => {
      const { encodedInvitation } = JSON.parse(invitationText);
      await client.echo.acceptInvitation(InvitationEncoder.decode(encodedInvitation));
      // TODO(wittjosiah): Get space.
      // invitation.authenticate(Buffer.from(secret));
      // const space = await invitation.getSpace();
      // setSpace(space);
    };

    const handleExportSpace = async (action: ExportAction) => {
      const blob = await spaceSerializer.serializeSpace(space!);
      switch (action) {
        case ExportAction.EXPORT_IPFS: {
          const file = new File([blob], `${space!.key.toHex()}.space`);
          const [ipfsFile] = await uploadFilesToIpfs(ipfsClient!, [file]);
          if (ipfsFile) {
            await navigator.clipboard.writeText(ipfsFile.cid);
            setSnackbarMessage('CID copied to clipbaord.');
          }
          break;
        }

        case ExportAction.EXPORT_FILE: {
          download(blob, `${space!.key.toHex()}.space`);
          break;
        }
      }
    };

    const handleImportSpace = async (fileOrCID: File | string) => {
      let data;
      if (fileOrCID instanceof File) {
        data = await new Uint8Array(await fileOrCID.arrayBuffer());
      } else {
        // TODO(burdon): Why not Promise.all? Wrap in util?
        data = uint8ArrayConcat(await all(ipfsClient!.cat(fileOrCID)));
      }

      setSpace(await spaceSerializer.deserializeSpace(data));
    };

    const handleInviteSpace = async () => {
      const { invitation } = await space!.createInvitation();
      const encodedInvitation = InvitationEncoder.encode(invitation!);
      const text = JSON.stringify({
        encodedInvitation,
        secret: invitation?.authenticationCode
      });
      await navigator.clipboard.writeText(text);
      console.log(text); // Required for playwright tests.
    };

    if (space) {
      return (
        <>
          <App space={space} onInvite={handleInviteSpace} onExport={handleExportSpace} />

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
      <CreateSpaceDialog open onCreate={handleCreateSpace} onJoin={handleJoinSpace} onImport={handleImportSpace} />
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
