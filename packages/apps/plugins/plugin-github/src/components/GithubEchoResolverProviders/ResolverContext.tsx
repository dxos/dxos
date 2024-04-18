//
// Copyright 2023 DXOS.org
//

import React, {
  createContext,
  type Context,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DocumentType, TextV0Type } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { useMulticastObservable } from '@dxos/react-client';
import { type Space, SpaceState, useQuery, useSpaces, getMeta } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { type DocumentResolverProps, type SpaceResolverProps } from './ResolverProps';
import { displayName, matchSpace } from './spaceResolvers';

const getLocationIdentifier = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const location = searchParams.get('location');
  let source, id;
  try {
    const url = location ? new URL(location) : undefined;
    source = url?.hostname.split('.').reverse().join('.');
    id = url?.pathname.slice(1);
  } catch (err) {
    log.catch(err);
  }
  return [source, id];
};

export const SpaceResolverContext: Context<SpaceResolverProps> = createContext<SpaceResolverProps>({
  space: null,
  setSpace: (_space) => {},
});

export const SpaceResolverProvider = ({ children }: PropsWithChildren<{}>) => {
  const identity = useIdentity();
  const identityHex = identity?.identityKey.toHex();
  const [source, id] = getLocationIdentifier();
  const spaces = useSpaces({ all: true });

  const [nextSpace, setSpace] = useState<Space | null>(null);

  const space = useMemo(
    () =>
      nextSpace ?? (identityHex ? spaces.find((space) => matchSpace(space, identityHex, source, id)) ?? null : null),
    [spaces, nextSpace, identityHex, source, id],
  );

  return (
    <SpaceResolverContext.Provider value={{ space, setSpace, source, id, identityHex }}>
      {children}
    </SpaceResolverContext.Provider>
  );
};

const defaultDocumentResolverContext: DocumentResolverProps = {
  document: null,
  setDocument: (_document) => {},
};

export const DocumentResolverContext: Context<DocumentResolverProps> =
  createContext<DocumentResolverProps>(defaultDocumentResolverContext);

const DocumentResolverProviderImpl = ({
  space,
  source,
  id,
  children,
}: PropsWithChildren<{ space: Space; source: string; id: string }>) => {
  const spaceState = useMulticastObservable(space.state);
  const [document, setDocument] = useState<DocumentType | null>(null);
  const defaultDisplayName = displayName(source, id);

  const documents = useQuery(space, (obj) => {
    const keys = getMeta(obj)?.keys;
    return keys?.find((key: any) => key.source === source && key.id === id);
  });

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent || spaceState !== SpaceState.READY) {
        return;
      }

      if (event.data.type === 'initial-data') {
        const nextDocument = create(DocumentType, {
          content: create(TextV0Type, { content: event.data.content }),
          title: defaultDisplayName,
        });
        getMeta(nextDocument).keys = [{ source, id }];
        space.db.add(nextDocument);
        setDocument(nextDocument);
      }
    };

    // todo(thure): Won't this always be the case initially?
    if (documents.length === 0) {
      window.addEventListener('message', handler);
      window.parent.postMessage({ type: 'request-initial-data' }, 'https://github.com');
      return () => window.removeEventListener('message', handler);
    } else {
      setDocument(documents[0] as DocumentType);
    }
  }, [spaceState, space, documents]);

  return (
    <DocumentResolverContext.Provider value={{ document, setDocument }}>{children}</DocumentResolverContext.Provider>
  );
};

export const DocumentResolverProvider = ({ children }: PropsWithChildren<{}>) => {
  const { space, source, id } = useContext(SpaceResolverContext);

  return space && source && id ? (
    <DocumentResolverProviderImpl space={space} source={source} id={id}>
      {children}
    </DocumentResolverProviderImpl>
  ) : (
    <DocumentResolverContext.Provider value={defaultDocumentResolverContext}>
      {children}
    </DocumentResolverContext.Provider>
  );
};
