//
// Copyright 2022 DXOS.org
//

import {
  CaretLeft,
  CaretUpDown,
  FrameCorners,
  PlusCircle,
  Robot,
  Target,
  UserPlus,
  WifiHigh,
  WifiSlash
} from '@phosphor-icons/react';
import assert from 'assert';
import clipboardCopy from 'clipboard-copy';
import React, { useContext, useEffect, useState, Suspense, useCallback } from 'react';
import { useHref, useNavigate, Link } from 'react-router-dom';

import { scheduleTaskInterval } from '@dxos/async';
import { CancellableInvitationObservable, Document, Invitation, PublicKey, ShellLayout } from '@dxos/client';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { ConnectionState, SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { observer, useClient, useMembers, useNetworkStatus, useSpaces } from '@dxos/react-client';
import { Button, DensityProvider, getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, useShell, useTogglePanelSidebar } from '@dxos/react-ui';

import { SpaceList, SpaceListAction, SpaceSettings } from '../../components';
import { FrameRegistryDialog } from '../../containers';
import {
  createInvitationPath,
  createPath,
  defaultFrameId,
  getIcon,
  useAppRouter,
  useTheme,
  Section,
  useFrames,
  useAppReducer
} from '../../hooks';
import { Intent, IntentAction } from '../../util';
import { MemberList } from '../MembersList';
import { objectMeta, SearchPanel, SearchResults } from '../SearchPanel';
import { FrameList } from './FrameList';

// TODO(burdon): Popup over space name (like Notion: option to rename/create/join, etc.)
// TODO(burdon): Move space join to members list.

const Separator = () => {
  return <div role='separator' className='bs-px bg-neutral-400/20 mlb-2 mli-2' />;
};

export const Sidebar = observer(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const client = useClient();
  const { space, section, frame } = useAppRouter();
  const spaces = useSpaces();
  const members = useMembers(space?.key);
  const shell = useShell();
  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);
  const { state: connectionState } = useNetworkStatus();
  const [showSpaceList, setShowSpaceList] = useState(false);
  const [showFrames, setShowFrames] = useState(false);
  const List = frame?.runtime.List;

  //
  // Invitations.
  //
  const [observable, setObservable] = useState<CancellableInvitationObservable>();
  const href = useHref(observable ? createInvitationPath(observable.invitation!) : '/');
  useEffect(() => {
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

  //
  // Search
  //
  const [showSearchResults, setShowSearchResults] = useState(false);
  const handleSearchResults = (results: SearchResults) => {
    setShowSearchResults(results.results.length > 0);
  };

  const handleSearchSelect = (object: Document) => {
    if (space) {
      const frame = objectMeta[object.__typename!]?.frame;
      if (frame) {
        navigate(createPath({ spaceKey: space.key, frame: frame.module.id, objectId: object.id }));
      }
    }
  };

  //
  // Space management.
  //
  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(createPath({ spaceKey: space.key, frame: defaultFrameId }));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE, { spaceKey: space!.key });
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

  //
  // Members focusing.
  //
  const membersLocations = new Map<string, string>();
  useEffect(() => {
    if (space) {
      const ctx = new Context();
      scheduleTaskInterval(
        ctx,
        async () => {
          await space.postMessage('currentLocation', {
            identityKey: client.halo.identity?.identityKey.toHex(),
            location: window.location.pathname
          });
        },
        500
      );

      ctx.onDispose(
        space!.listen('currentLocation', ({ payload: { identityKey, location } }) => {
          if (!membersLocations.has(identityKey) || membersLocations.get(identityKey) !== location) {
            membersLocations.set(identityKey, location);
          }
        })
      );
      return () => {
        void ctx.dispose();
      };
    }
  }, [space]);

  const { active: activeFrames } = useFrames();
  const { setActiveFrame } = useAppReducer();

  const focusOnMember = useCallback((member: SpaceMember) => {
    const path = membersLocations.get(member.identity.identityKey.toHex());

    // Check if Frame which we are try to focus in is installed, and install it if necessary.
    const id = path?.split('/')[3].split('_').join('.');
    // TODO(mykola): Reconcile with FrameRegistry
    if (id) {
      const activate = !activeFrames.find((frameId) => frameId === id);
      if (activate) {
        setActiveFrame(id, activate);
      }
    }

    if (path) {
      navigate(path);
    }
  }, []);

  //
  // Connection.
  //
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
      <div className='flex flex-col shrink-0'>
        <div className={mx('flex items-center pl-4 h-[40px]', theme.classes.header)}>
          <div className='flex items-center'>
            <Icon className={getSize(6)} data-testid='sidebar.spaceIcon' />
            <div className='pl-2 text-lg'>{space.properties.name}</div>
            <Button
              variant='ghost'
              className='p-0'
              data-testid='sidebar.showSpaceList'
              onClick={() => setShowSpaceList((show) => !show)}
            >
              <CaretUpDown className={mx(getSize(4), 'ml-2')} />
            </Button>
          </div>

          <div className='flex grow' />

          <Button variant='ghost' className='p-0' onClick={toggleSidebar}>
            {displayState === 'show' && <CaretLeft className={getSize(6)} />}
          </Button>
        </div>

        {/* <div className={mx('flex h-[8px]', theme.classes.toolbar)} /> */}
      </div>

      {/* Spaces */}
      {/* TODO(burdon): Radix Popover. */}
      {showSpaceList && (
        <div className='flex flex-col overflow-y-auto bg-white border-b'>
          <SpaceList spaces={spaces} selected={space.key} onAction={handleSpaceListAction} />

          {/* TODO(burdon): Observable. */}
          <div className='flex flex-col m-2 my-4'>
            <SpaceSettings space={space} />
          </div>

          {/* Menu */}
          <div className='flex flex-col w-full px-4 py-2 border-t'>
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
        <div className='flex flex-col overflow-hidden space-y-2'>
          <div className='shrink-0'>
            <SearchPanel onResults={handleSearchResults} onSelect={handleSearchSelect} />
          </div>

          {/* TODO(burdon): Items if not actively searching. */}
          {!showSearchResults && (
            <div className='overflow-y-scroll space-y-4'>
              <FrameList />

              {List && (
                <>
                  <Separator />
                  <div className='flex px-3'>
                    <DensityProvider density='fine'>
                      <Suspense>{<List />}</Suspense>
                    </DensityProvider>
                  </div>
                  <Separator />
                </>
              )}

              <div className='flex flex-col'>
                <div className='ml-4'>
                  <Button variant='ghost' className='p-0' onClick={() => setShowFrames(true)}>
                    <FrameCorners className={getSize(6)} />
                    <div className='flex pl-2'>Frames</div>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className='flex-1' />

      {/* Members */}
      <div className='flex shrink-0 flex-col my-2'>
        <div className='pl-2'>
          <Button
            variant='ghost'
            title='Share space'
            onClick={(event) =>
              handleSpaceListAction({
                action: IntentAction.SPACE_SHARE,
                data: { spaceKey: space.key, modifier: event.getModifierState('Shift') }
              })
            }
            data-testid='space-share'
          >
            <UserPlus className={getSize(6)} />
          </Button>
        </div>

        <MemberList identityKey={client.halo.identity!.identityKey} members={members} onSelect={focusOnMember} />

        <Link
          className={mx('flex w-full px-4 py-1 mt-2 items-center', section === Section.BOTS && 'bg-zinc-200')}
          to={createPath({ spaceKey: space.key, section: Section.BOTS })}
        >
          <Robot className={getSize(6)} />
          <div className='flex pl-2'>Bots</div>
        </Link>

        <Separator />

        <Button variant='ghost' onClick={handleToggleConnection} className='justify-start mli-2'>
          {connectionState === ConnectionState.ONLINE ? (
            <WifiHigh className={getSize(5)} />
          ) : (
            <WifiSlash className={mx(getSize(5), 'text-selection-text')} />
          )}
          <span className='mis-2'>Toggle connection</span>
        </Button>
      </div>

      <FrameRegistryDialog open={showFrames} onClose={() => setShowFrames(false)} />
    </div>
  );
});
