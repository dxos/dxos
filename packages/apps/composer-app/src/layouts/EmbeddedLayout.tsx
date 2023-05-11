//
// Copyright 2023 DXOS.org
//
import React, { useCallback } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import { Button } from '@dxos/aurora';
import { useSpaces } from '@dxos/react-client';
import { ShellProvider } from '@dxos/react-shell';

import type { OutletContext } from './OutletContext';

export const EmbeddedLayout = () => {
  const [searchParams] = useSearchParams();
  const { location } = useParams();
  const spaces = useSpaces({ all: true });
  const space = spaces[0];
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const haloInvitationCode = searchParams.get('haloInvitationCode');

  const handleCloseEmbed = useCallback(() => {
    window.parent.postMessage({ type: 'close-embed' }, '*');
  }, []);

  let document;

  if (location && space) {
    const url = new URL(location);
    const source = url.hostname.split('.').reverse().join('.');
    const id = url.pathname.slice(1);
    // TODO(wittjosiah): Space picker.
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

  return (
    <ShellProvider
      space={space}
      spaceInvitationCode={spaceInvitationCode}
      haloInvitationCode={haloInvitationCode}
      onJoinedSpace={(nextSpaceKey) => {
        console.warn('TODO: onJoinedSpace', nextSpaceKey);
      }}
    >
      <Outlet context={{ space, document, layout: 'embedded' } as OutletContext} />
      <Button className='fixed inline-end-0 block-end-0' onClick={handleCloseEmbed}>
        Close
      </Button>
    </ShellProvider>
  );
};
