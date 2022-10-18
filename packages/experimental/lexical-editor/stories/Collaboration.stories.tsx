//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import debug from 'debug';
import React, { FC, useEffect, useState } from 'react';

import { Item, InvitationDescriptor, Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { useClient, ClientProvider } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { TextModel } from '@dxos/text-model';

import { Editor, useProviderFactory } from '../src';
import { Container } from './helpers';

const log = debug('dxos:lexical:test');
debug.enable('dxos:lexical:*');

export default {
  title: 'Lexical/Collaboration'
};

// TODO(burdon): Scrolling.
// TODO(burdon): Multi items with separate editors (with drag-and-drop).

const tableStyles = css`
  tr {
    vertical-align: top;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    overflow: hidden;
    word-break: break-all;
  }
`;

type InvitationInfo = {
  descriptor: InvitationDescriptor
  secret: string
}

const DOCMENT_TYPE = 'example:type/document';

const EditorContainer: FC<{
  id: string
  invitation?: InvitationInfo
  onInvite?: (invitation: InvitationInfo) => void
}> = ({
  id,
  invitation,
  onInvite
}) => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [item, setItem] = useState<Item<TextModel>>();
  const providerFactory = useProviderFactory(item);

  useEffect(() => {
    if (onInvite) {
      setTimeout(async () => {
        client.echo.registerModel(TextModel);
        const party = await client.echo.createParty();
        const invitation = await party.createInvitation();
        onInvite({ descriptor: invitation.descriptor, secret: invitation.secret.toString() });
        log(`Created: ${party.key.toHex()}`);
        setParty(party);

        const item = await party.database.createItem({
          model: TextModel,
          type: DOCMENT_TYPE
        });

        setItem(item);
      });
    }

    if (invitation) {
      setTimeout(async () => {
        client.echo.registerModel(TextModel);
        const accept = await client.echo.acceptInvitation(invitation.descriptor);
        accept.authenticate(Buffer.from(invitation.secret));
        const party = await accept.getParty();
        log(`Joined: ${party.key.toHex()}`);
        setParty(party);

        // TODO(burdon): Race condition? result.on doesn't fire. Option to make subscription
        const result = party.database.select({ type: DOCMENT_TYPE }).exec();
        setItem(result.expectOne());
      });
    }
  }, [invitation]);

  // TODO(burdon): Display client ID.
  return (
    <div style={{
      display: 'flex',
      flex: 1,
      margin: 8,
      padding: 8,
      border: '1px solid #ccc'
    }}>
      {party && item && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}>
          <div style={{
            display: 'flex',
            flex: 1
          }}>
            <Editor
              id={id}
              item={item}
            >
              <CollaborationPlugin
                id={id}
                providerFactory={providerFactory}
                shouldBootstrap={true}
                username={id}
              />
            </Editor>
          </div>

          <div style={{
            display: 'flex',
            flexShrink: 0,
            overflow: 'hidden',
            padding: 8,
            fontFamily: 'monospace'
          }}>
            <table className={tableStyles}>
              <tbody>
                <tr>
                  <td style={{ width: 60 }}>Profile</td>
                  <td>{truncateKey(client.halo.profile!.publicKey.toHex(), 8)}</td>
                </tr>
                <tr>
                  <td>Party</td>
                  <td>{truncateKey(party.key.toHex(), 8)}</td>
                </tr>
                <tr>
                  <td>Item</td>
                  <td>{truncateKey(item.id, 8)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export const Primary = () => {
  const [invitation, setInvitation] = useState<InvitationInfo>();

  return (
    <Container>
      <ClientProvider>
        <ProfileInitializer>
          <EditorContainer
            id='editor-1'
            onInvite={setInvitation}
          />
        </ProfileInitializer>
      </ClientProvider>

      <ClientProvider>
        <ProfileInitializer>
          <EditorContainer
            id='editor-2'
            invitation={invitation}
          />
        </ProfileInitializer>
      </ClientProvider>
    </Container>
  );
};
