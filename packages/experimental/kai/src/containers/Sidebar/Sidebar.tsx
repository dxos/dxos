//
// Copyright 2022 DXOS.org
//

import {
  AppWindow,
  CaretCircleDoubleDown,
  CaretLeft,
  Info,
  Graph,
  PlusCircle,
  Robot,
  UserPlus,
  WifiHigh,
  WifiSlash,
  X
} from '@phosphor-icons/react';
import assert from 'assert';
import clipboardCopy from 'clipboard-copy';
import React, { useContext, useEffect, useState, Suspense, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { scheduleTaskInterval } from '@dxos/async';
import { Button, DensityProvider, getSize, mx } from '@dxos/aurora';
import { CancellableInvitationObservable, TypedObject, Invitation, PublicKey, ShellLayout } from '@dxos/client';
import { Context } from '@dxos/context';
import { objectMeta } from '@dxos/kai-frames';
import { log } from '@dxos/log';
import { ConnectionState, SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { observer, useClient, useKeyStore, useMembers, useNetworkStatus, useSpaces } from '@dxos/react-client';
import { PanelSidebarContext, useShell, useTogglePanelSidebar } from '@dxos/react-ui';

import { SpaceList, SpaceListAction, SpaceSettings } from '../../components';
import { FrameObjectList, FrameRegistryDialog } from '../../containers';
import {
  createInvitationPath,
  createPath,
  getIcon,
  defaultFrameId,
  Section,
  SearchResults,
  useAppRouter,
  useTheme,
  useAppReducer,
  useAppState,
  optionsKeys,
  bool
} from '../../hooks';
import { Intent, IntentAction } from '../../util';
import { MemberList } from '../MembersList';
import { SearchPanel } from '../SearchPanel';
import { FrameList } from './FrameList';

const Separator = () => {
  return <div role='separator' className='bs-px bg-neutral-400/20 mlb-2 mli-2' />;
};

export type SidebarProps = {
  onNavigate: (path: string) => void;
};

// TODO(burdon): Remove observer?
// TODO(burdon): Split into sub-components.
export const Sidebar = observer(({ onNavigate }: SidebarProps) => {
  // TODO(burdon): Factor out app state/nav.
  const { space, section, frame, objectId } = useAppRouter(); // TODO(burdon): Factor out.
  const [options] = useKeyStore(optionsKeys);
  const { setActiveFrame } = useAppReducer();
  const shell = useShell();

  const theme = useTheme();
  const client = useClient();
  const spaces = useSpaces();
  const members = useMembers(space?.key);

  // TODO(burdon): Error if conditional filter.
  // const objects = useQuery(space, frame?.runtime.filter?.());
  useEffect(() => {
    if (space && frame && frame.runtime.filter && !objectId) {
      const { objects } = space.db.query(frame.runtime.filter());
      if (objects.length) {
        handleSelectObject(objects[0].id);
      }
    }
  }, [space, frame]);

  //
  // UX state
  //

  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);
  const { state: connectionState } = useNetworkStatus();
  const [showSpaceList, setShowSpaceList] = useState(false);
  const [showFrames, setShowFrames] = useState(false);

  //
  // Invitations
  //

  const [observable, setObservable] = useState<CancellableInvitationObservable>();
  useEffect(() => {
    return () => {
      void observable?.cancel();
    };
  }, []);

  useEffect(() => {
    if (observable) {
      const href = createInvitationPath(observable.get());
      const url = new URL(href, window.origin);
      console.log(url);
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

  const handleSearchSelect = (object: TypedObject) => {
    if (space) {
      // TODO(burdon): Add to search result.
      const frame = objectMeta[object.__typename!]?.frame;
      if (frame) {
        onNavigate(createPath({ spaceKey: space!.key, frame: frame?.module.id, objectId: object.id }));
      }
    }
  };

  //
  // Space management
  //

  const handleSelectObject = (objectId: string) => {
    onNavigate(createPath({ spaceKey: space!.key, frame: frame?.module.id, objectId }));
  };

  const handleCreateSpace = async () => {
    const space = await client.createSpace();
    onNavigate(createPath({ spaceKey: space.key, frame: defaultFrameId }));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE, { spaceKey: space!.key });
  };

  const handleSpaceListAction = (intent: Intent<SpaceListAction>) => {
    const space = spaces.find(({ key }) => key.equals(intent.data.spaceKey));
    assert(space);

    switch (intent.action) {
      case IntentAction.SPACE_SELECT: {
        onNavigate(createPath({ spaceKey: intent.data.spaceKey, frame: frame?.module.id }));
        break;
      }

      case IntentAction.SPACE_SHARE: {
        if (intent.data.modifier) {
          const swarmKey = PublicKey.random();
          const observable = space.createInvitation({
            swarmKey,
            type: Invitation.Type.MULTIUSE,
            authMethod: Invitation.AuthMethod.NONE
          });

          const subscription = observable.subscribe(
            (invitation: Invitation) => {
              if (invitation.state === Invitation.State.CONNECTING) {
                setObservable(observable);
                subscription.unsubscribe();
              }
            },
            (error) => {
              log.error(error);
              subscription.unsubscribe();
            }
          );
        } else {
          void shell.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: intent.data.spaceKey });
        }

        break;
      }
    }
  };

  //
  // Members focusing
  //

  const membersLocations = new Map<string, string>();
  useEffect(() => {
    if (space) {
      const ctx = new Context();
      scheduleTaskInterval(
        ctx,
        async () => {
          await space.postMessage('currentLocation', {
            identityKey: client.halo.identity.get()?.identityKey.toHex(),
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

  const { frames: activeFrames } = useAppState();
  // const frameRegistry = useFrameRegistry();
  const focusOnMember = useCallback((member: SpaceMember) => {
    const path = membersLocations.get(member.identity.identityKey.toHex());

    // TODO(burdon): Hack.
    // Check if Frame which we are try to focus in is installed, and install it if necessary.
    const id = path?.split('/')[3].split('_').join('.');
    // TODO(mykola): Reconcile with FrameRegistry.
    if (id) {
      const activate = !activeFrames.find((frameId) => frameId === id);
      if (activate) {
        setActiveFrame(id, activate);
      }
    }

    if (path) {
      onNavigate(path);
    }
  }, []);

  //
  // Connection
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
  const { Plugin } = frame?.runtime ?? {};

  return (
    <DensityProvider density='fine'>
      <div
        role='none'
        className={mx(
          'flex flex-col w-full h-full overflow-hidden min-bs-full bg-sidebar-bg',
          theme.panel === 'flat' && 'border-r'
        )}
      >
        {/* Header */}
        <div className='flex flex-col shrink-0'>
          <div className={mx('flex overflow-hidden items-center h-[40px]', theme.classes.header)}>
            <div className='flex overflow-hidden grow items-center'>
              <div className='flex shrink-0 px-3'>
                <Icon className={getSize(8)} weight='duotone' data-testid='sidebar.spaceIcon' />
              </div>
              <div className='truncate text-lg'>{space.properties.name ?? 'Space'}</div>
            </div>

            <div className='flex shrink-0 items-center'>
              <Button
                variant='ghost'
                className='flex p-0 px-1'
                data-testid='sidebar.showSpaceList'
                onClick={() => setShowSpaceList((show) => !show)}
              >
                <Info className={getSize(5)} />
              </Button>
              <Button variant='ghost' className='p-0 pr-2' onClick={toggleSidebar}>
                {displayState === 'show' && <CaretLeft className={getSize(6)} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Spaces */}
        {showSpaceList && (
          <div className='flex flex-col w-full overflow-y-auto bg-white border-b'>
            <div className='flex justify-center my-4'>
              <SpaceSettings space={space} />
            </div>

            <div className='border-t border-b'>
              <SpaceList spaces={spaces} selected={space.key} onAction={handleSpaceListAction} />
            </div>

            <div className='flex flex-col px-4 py-2'>
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
                <CaretCircleDoubleDown className={getSize(6)} />
                <span className='pl-2'>Join space</span>
              </Button>
              <Button
                variant='ghost'
                className='flex p-0 justify-start'
                title='Close settings'
                data-testid='sidebar.closeSettings'
                onClick={() => setShowSpaceList(false)}
              >
                <X className={getSize(6)} />
                <span className='pl-2'>Close</span>
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        {!showSpaceList && (
          <div className='flex flex-col overflow-hidden space-y-2'>
            {(bool(options.get('experimental.search')) && (
              <SearchPanel onResults={handleSearchResults} onSelect={handleSearchSelect} />
            )) || <div className='mt-2' />}

            {/* Items if not actively searching. */}
            {!showSearchResults && (
              <div className='overflow-y-scroll space-y-4'>
                {/* Frame list filter. */}
                {bool(options.get('experimental.frames')) && <FrameList />}

                {/* Generic object list. */}
                {!Plugin && frame?.runtime.filter && (
                  <FrameObjectList frameDef={frame.runtime} onSelect={handleSelectObject} />
                )}

                {/* Frame-specific plugin. */}
                {/* TODO(burdon): Plugin spec (space, onSelect). */}
                {Plugin && (
                  <Suspense>
                    {
                      <Plugin
                        space={space}
                        onSelect={(objectId: string) => {
                          onNavigate(createPath({ spaceKey: space.key, frame: frame?.module.id, objectId }));
                        }}
                      />
                    }
                  </Suspense>
                )}

                {/* Frame registry dialog. */}
                {bool(options.get('experimental.frames')) && (
                  <div className='flex px-4 items-center'>
                    <Button variant='ghost' className='p-0' onClick={() => setShowFrames(true)}>
                      <AppWindow className={getSize(6)} />
                    </Button>
                    {/* TODO(burdon): Put inside button? */}
                    <span className='w-full pl-2'>Frames</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className='flex-1' />

        {/* Members */}
        <div className='flex shrink-0 flex-col my-2'>
          <div className='pl-2'>
            <Button
              data-testid='space-share'
              variant='ghost'
              title='Share space'
              onClick={(event) =>
                handleSpaceListAction({
                  action: IntentAction.SPACE_SHARE,
                  data: { spaceKey: space.key, modifier: event.getModifierState('Shift') }
                })
              }
            >
              <UserPlus className={getSize(6)} />
            </Button>
          </div>

          <MemberList
            identityKey={client.halo.identity.get()!.identityKey}
            members={members}
            onSelect={focusOnMember}
          />

          <Separator />
          {bool(options.get('experimental.bots')) && (
            <Link
              className={mx('flex px-4 py-1', section === Section.BOTS && 'bg-zinc-200')}
              to={createPath({ spaceKey: space.key, section: Section.BOTS })}
            >
              <Robot className={getSize(6)} />
              <div className='pl-2'>Bots</div>
            </Link>
          )}

          {bool(options.get('experimental.metagraph')) && (
            <Link
              className={mx('flex px-4 py-1', section === Section.DMG && 'bg-zinc-200')}
              to={createPath({ spaceKey: space.key, section: Section.DMG })}
            >
              <Graph className={getSize(6)} />
              <div className='pl-2'>Metagraph</div>
            </Link>
          )}

          <Separator />
          <div className='flex mli-2 items-center'>
            <Button variant='ghost' className='p-0 px-2' onClick={handleToggleConnection}>
              {connectionState === ConnectionState.ONLINE ? (
                <WifiHigh className={getSize(6)} />
              ) : (
                <WifiSlash className={mx(getSize(6), 'text-selection-text')} />
              )}
            </Button>
            <span>Toggle connection</span>
          </div>
        </div>

        <FrameRegistryDialog open={showFrames} onClose={() => setShowFrames(false)} />
      </div>
    </DensityProvider>
  );
});
