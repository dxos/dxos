//
// Copyright 2023 DXOS.org
//
import React, { useCallback, useState } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import { Button } from '@dxos/aurora';
import { Space, useIdentity, useSpaces } from '@dxos/react-client';
import { ShellProvider } from '@dxos/react-shell';

import { ResolverDialog } from '../components';
import { matchSpace } from '../util';
import type { OutletContext } from './OutletContext';

const useResolveLocation = () => {
  const { '*': location } = useParams();
  const spaces = useSpaces({ all: true });
  const identity = useIdentity({ login: true });
  const [space, setNextSpace] = useState<Space | null>(null);

  if (!location || !identity) {
    return { document: undefined, source: undefined, id: undefined, space, setNextSpace };
  }

  const identityHex = identity?.identityKey.toHex();
  const url = new URL(location);
  const source = url.hostname.split('.').reverse().join('.');
  const id = url.pathname.slice(1);

  const nextSpace = spaces.find((space) => matchSpace(space, identityHex, source, id));

  nextSpace && setNextSpace(nextSpace);

  let document;

  if (location && space) {
    const documents = space.db.query((obj) => {
      const keys = obj.meta?.keys;
      return keys?.find((key: any) => key.source === source && key.id === id);
    }).objects;
    document = documents[0];
    if (!document) {
      document = new Document({
        meta: {
          keys: [{ source, id }]
        }
      });
      space.db.add(document);
    }
  }

  return { document, space, source, id, setNextSpace };
};

export const EmbeddedLayout = () => {
  const [searchParams] = useSearchParams();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const haloInvitationCode = searchParams.get('haloInvitationCode');

  const { space, document, source, id, setNextSpace } = useResolveLocation();

  console.log('[location]', source, id, space, document);

  const handleCloseEmbed = useCallback(() => {
    window.parent.postMessage({ type: 'close-embed' }, '*');
  }, []);

  return (
    <ShellProvider
      space={space || undefined}
      spaceInvitationCode={spaceInvitationCode}
      haloInvitationCode={haloInvitationCode}
      onJoinedSpace={(nextSpaceKey) => {
        console.warn('TODO: onJoinedSpace', nextSpaceKey);
      }}
    >
      {space && document ? (
        <Outlet context={{ space, document, layout: 'embedded' } as OutletContext} />
      ) : source && id ? (
        <ResolverDialog {...{ source, id, setNextSpace }} />
      ) : null}
      <Button className='fixed inline-end-0 block-end-0' onClick={handleCloseEmbed}>
        Close
      </Button>
    </ShellProvider>
  );
};
