//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import clipboardCopy from 'clipboard-copy';
import { CaretLeft, FrameCorners, PlusCircle, Robot, Target, WifiHigh, WifiSlash } from 'phosphor-react';
import React, { Suspense, useContext, useEffect, useState } from 'react';
import { Link, useHref, useNavigate } from 'react-router-dom';

import { CancellableInvitationObservable, Document, Invitation, PublicKey, ShellLayout } from '@dxos/client';
import { log } from '@dxos/log';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { useClient, useMembers, useNetworkStatus, useSpaces } from '@dxos/react-client';
import { Button, DensityProvider, getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, useShell, useTogglePanelSidebar } from '@dxos/react-ui';

import { SpaceList, SpaceListAction } from '../../components';
import { SpaceSettings } from '../../containers';
import {
  createInvitationPath,
  createPath,
  defaultFrameId,
  getIcon,
  useAppRouter,
  useFrames,
  useTheme,
  Section
} from '../../hooks';
import { Intent, IntentAction } from '../../util';
import { MemberList } from '../MembersList';
import { objectMeta, SearchPanel } from '../SearchPanel';

const FrameSelector = () => {
  const { space } = useAppRouter();
  const { frames, active: activeFrames } = useFrames();
  const { frame: currentFrame } = useAppRouter();
  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col'>
        {Array.from(activeFrames)
          .map((frameId) => frames.get(frameId)!)
          .filter(Boolean)
          .map(({ module: { id, displayName }, runtime: { Icon } }) => (
            <Link
              key={id}
              className={mx('flex w-full px-4 py-1 items-center', id === currentFrame?.module.id && 'bg-zinc-200')}
              to={createPath({ spaceKey: space.key, frame: id })}
            >
              <Icon className={getSize(6)} />
              <div className='flex w-full pl-2'>{displayName}</div>
            </Link>
          ))}
      </div>
    </div>
  );
};

export const Sidebar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const client = useClient();
  const { space, section, frame } = useAppRouter();
  const spaces = useSpaces();
  const members = useMembers(space?.key);
  const shell = useShell();
  const [prevSpace, setPrevSpace] = useState(space);
  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);
  const isOpen = displayState === 'show';
  const { state: connectionState } = useNetworkStatus();
  const [searchMode, setSearchMode] = useState(true);
  const [showSpaceList, setShowSpaceList] = useState(false);
  const List = frame?.runtime.List;

  const [observable, setObservable] = useState<CancellableInvitationObservable>();
  const href = useHref(observable ? createInvitationPath(observable.invitation!) : '/');
  useEffect(() => {
    // TODO(burdon): Unsubscribe.
    return () => {
      void observable?.cancel();
    };
  }, []);

  useEffect(() => {
    if (observable) {
      const url = new URL(href, window.origin);
      void clipboardCopy(url.toString());
    }
  }, [observable]);

  useEffect(() => {
    setShowSpaceList(false);
  }, [space]);

  // TODO(wittjosiah): Find a better way to do this.
  if (prevSpace !== space) {
    setPrevSpace(space);
  }

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(createPath({ spaceKey: space.key, frame: defaultFrameId }));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE, { spaceKey: space?.key });
  };

  const handleSpaceListAction = (intent: Intent<SpaceListAction>) => {
    const space = spaces.find(({ key }) => key.equals(intent.data.spaceKey));
    assert(space);

    switch (intent.action) {
      case IntentAction.SPACE_SELECT: {
        navigate(createPath({ spaceKey: intent.data.spaceKey, frame: frame?.module.id }));
        break;
      }

      case IntentAction.SPACE_SHARE: {
        if (intent.data.modifier) {
          const swarmKey = PublicKey.random();
          const observable = space.createInvitation({
            swarmKey,
            authMethod: AuthMethod.NONE,
            type: Invitation.Type.MULTIUSE_TESTING
          });

          const unsubscribe = observable.subscribe({
            onConnecting: () => {
              setObservable(observable);
              unsubscribe();
            },
            onConnected: () => {},
            onSuccess: () => {},
            onError: (error) => {
              log.error(error);
              unsubscribe();
            }
          });
        } else {
          void shell.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: intent.data.spaceKey });
        }

        break;
      }
    }
  };

  const handleToggleConnection = async () => {
    switch (connectionState) {
      case ConnectionState.OFFLINE: {
        await client.mesh.setConnectionState(ConnectionState.ONLINE);
        break;
      }
      case ConnectionState.ONLINE: {
        await client.mesh.setConnectionState(ConnectionState.OFFLINE);
        break;
      }
    }
  };

  const handleSelect = (object: Document) => {
    if (space) {
      const frame = objectMeta[object.__typename!]?.frame;
      if (frame) {
        navigate(createPath({ spaceKey: space.key, frame: frame?.module.id, objectId: object.id }));
      }
    }
  };

  // TODO(burdon): Popup over space name (like Notion: option to rename/create/join, etc.)

  if (!space) {
    return null;
  }

  const Icon = getIcon(space.properties.icon);

  return (
    <div
      role='none'
      className={mx(
        'flex flex-col h-full overflow-hidden min-bs-full bg-sidebar-bg',
        theme.panel === 'flat' && 'border-r'
      )}
    >
      {/* Space Selector */}
      <div className={mx('flex shrink-0 items-center pl-4 h-[40px]', theme.classes.header)}>
        <div className='flex items-center'>
          <Button variant='ghost' className='p-0' onClick={() => setShowSpaceList((show) => !show)}>
            <Icon className={getSize(6)} />
          </Button>
          <div className='pl-2 text-lg'>{space.properties?.name}</div>
        </div>

        <div className='flex grow' />

        <Button variant='ghost' className='p-0' onClick={toggleSidebar}>
          {isOpen && <CaretLeft className={getSize(6)} />}
        </Button>
      </div>

      <div className={mx('flex h-[8px]', theme.classes.toolbar)} />

      {/* Spaces */}
      {/* TODO(burdon): Radix Popover */}
      {showSpaceList && (
        <div className='flex flex-col overflow-y-auto bg-white pb-2 border-b'>
          <SpaceList spaces={spaces} frame={frame} selected={space?.key} onAction={handleSpaceListAction} />

          {/* TODO(burdon): Observable. */}
          <div className='flex flex-col m-2 my-4'>
            <SpaceSettings space={space} />
          </div>

          {/* Menu */}
          <div className='flex flex-col w-full px-4'>
            <Button
              variant='ghost'
              className='flex p-0 justify-start'
              title='Create new space'
              data-testid='sidebar.createSpace'
              onClick={handleCreateSpace}
            >
              <PlusCircle className={getSize(6)} />
              <span className='pl-2'>Create space</span>
            </Button>
            <Button
              variant='ghost'
              className='flex p-0 justify-start'
              title='Join a space'
              data-testid='sidebar.joinSpace'
              onClick={handleJoinSpace}
            >
              <Target className={getSize(6)} />
              <span className='pl-2'>Join space</span>
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      {!showSpaceList && (
        <div className='flex flex-col overflow-hidden space-y-4'>
          <SearchPanel onSelect={handleSelect} />

          {/* TODO(burdon): Items if not actively searching. */}
          <FrameSelector />

          {List && (
            <>
              <Divider />
              <div className='flex px-3'>
                <DensityProvider density='fine'>
                  <Suspense>{<List />}</Suspense>
                </DensityProvider>
              </div>
              <Divider />
            </>
          )}

          <div className='flex flex-col'>
            <Link
              className={mx('flex w-full px-4 py-1 items-center', section === Section.REGISTRY && 'bg-zinc-200')}
              to={createPath({ spaceKey: space.key, section: Section.REGISTRY })}
            >
              <FrameCorners className={getSize(6)} />
              <div className='flex pl-2'>Frames</div>
            </Link>
            <Link
              className={mx('flex w-full px-4 py-1 items-center', section === Section.BOTS && 'bg-zinc-200')}
              to={createPath({ spaceKey: space.key, section: Section.BOTS })}
            >
              <Robot className={getSize(6)} />
              <div className='flex pl-2'>Bots</div>
            </Link>
          </div>
        </div>
      )}

      <div className='flex-1' />

      {/* Members */}
      <div className='flex shrink-0 flex-col my-4'>
        <MemberList identityKey={client.halo.identity!.identityKey} members={members} />

        <Divider />

        <Button variant='ghost' onClick={handleToggleConnection} className='justify-start mli-2'>
          {connectionState === ConnectionState.ONLINE ? (
            <WifiHigh className={getSize(5)} />
          ) : (
            <WifiSlash className={mx(getSize(5), 'text-selection-text')} />
          )}
          <span className='mis-2'>Toggle connection</span>
        </Button>
      </div>
    </div>
  );
};

const Divider = () => <div role='separator' className='bs-px bg-neutral-400/20 mlb-2 mli-2' />;
