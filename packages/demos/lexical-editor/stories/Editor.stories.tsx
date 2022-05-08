//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import React, { FC, ReactNode, useEffect, useState } from 'react';

import { Item, InvitationDescriptor } from '@dxos/client';
import { TextModel } from '@dxos/text-model';
import { useClient } from '@dxos/react-client';
import { ClientProvider, ProfileInitializer } from '@dxos/react-client';

import { Editor } from '../src';

const log = debug('dxos:lexical:test');
debug.enable('dxos:lexical:*');

export default {
  title: 'Lexical/Editor'
};

const Container: FC<{
  children: ReactNode
}> = ({
  children
}) => {
  return (
    <div style={{
      display: 'flex',
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        flex: 1,
        maxHeight: '100%',
        backgroundColor: '#FAFAFA'
      }}>
        {children}
      </div>
    </div>
  );
};

type InvitationInfo = {
  descriptor: InvitationDescriptor
  secret: string
}

const DOCMENT_TYPE = 'example:type/document';

const EditorContainer: FC<{
  id: string,
  invitation?: InvitationInfo,
  onInvite?: (invitation: InvitationInfo) => void
}> = ({
  id,
  invitation,
  onInvite
}) => {
  const client = useClient();
  const [item, setItem] = useState<Item<TextModel>>();

  useEffect(() => {
    if (onInvite) {
      setImmediate(async () => {
        client.echo.registerModel(TextModel);
        const party = await client.echo.createParty();
        const invitation = await party.createInvitation();
        onInvite({ descriptor: invitation.descriptor, secret: invitation.secret.toString() });
        log(`Created: ${party.key.toHex()}`);

        const item = await party.database.createItem({
          model: TextModel,
          type: DOCMENT_TYPE
        });

        setItem(item);
      });
    }

    if (invitation) {
      setImmediate(async () => {
        client.echo.registerModel(TextModel);
        const accept = await client.echo.acceptInvitation(invitation.descriptor);
        accept.authenticate(Buffer.from(invitation.secret));
        const party = await accept.getParty();
        log(`Joined: ${party.key.toHex()}`);

        // TODO(burdon): Race condition? result.on doesn't fire.
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
      {item && (
        <Editor
          id={id}
          item={item}
        />
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
