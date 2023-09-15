//
// Copyright 2022 DXOS.org
//

import { CaretLeft, Info, Function, Graph, PuzzlePiece, Users, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import React, { useEffect, useState, Suspense } from 'react';

import { Button, DensityProvider, Main, ClassNameValue, useSidebars } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { invariant } from '@dxos/invariant';
import { searchMeta } from '@dxos/kai-frames';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { TypedObject, useSpaces } from '@dxos/react-client/echo';
import { useNetworkStatus } from '@dxos/react-client/mesh';

import { FrameList } from './FrameList';
import { ObjectAction, ObjectActionType, ObjectList } from './ObjectList';
import { Separator, SpaceListPanel } from './SpaceListPanel';
import { SpaceListAction } from '../../components';
import { FrameRegistryDialog } from '../../containers';
import {
  Section,
  SearchResults,
  createPath,
  getIcon,
  useAppRouter,
  useAppState,
  useCreateInvitation,
  useTheme,
} from '../../hooks';
import { Intent, IntentAction } from '../../util';
import { MemberList } from '../MembersList';
import { SearchPanel } from '../SearchPanel';

const SIDEBAR_NAME = 'KaiFrameworkSidebar';

export type SidebarProps = {
  onNavigate: (path: string) => void;
  className?: ClassNameValue;
};

// TODO(burdon): Convert into Frame.
export const Sidebar = ({ className, onNavigate }: SidebarProps) => {
  // TODO(burdon): Factor out app state/nav.
  const { space, frame, objectId } = useAppRouter(); // TODO(burdon): Factor out.
  const { showDeletedObjects } = useAppState();
  // const [options] = useKeyStore(optionsKeys);
  const getOption = (key: string, def = true): boolean => {
    // return options.get(key) === 'true';
    return true;
  };

  const theme = useTheme();
  const client = useClient();
  const spaces = useSpaces();
  const startInvitation = useCreateInvitation();

  const [showFrames, setShowFrames] = useState(false);

  // TODO(burdon): Error if conditional filter.
  // const objects = useQuery(space, frame?.runtime.filter?.());
  useEffect(() => {
    if (space && frame && frame.runtime.filter && !objectId) {
      const { objects } = space.db.query(frame.runtime.filter());
      if (objects.length) {
        handleObjectAction({ type: ObjectActionType.SELECT, object: objects[0] });
      }
    }
  }, [space, frame]);

  //
  // App state
  //

  const { toggleNavigationSidebar, navigationSidebarOpen } = useSidebars(SIDEBAR_NAME);
  const { swarm: connectionState } = useNetworkStatus();
  const [showSpacePanel, setShowSpacePanel] = useState(false);

  const [showSearchResults, setShowSearchResults] = useState(false);
  const handleSearchResults = (results: SearchResults) => {
    setShowSearchResults(results.results.length > 0);
  };

  const handleSearchSelect = (object: TypedObject) => {
    if (space) {
      // TODO(burdon): Add to search result.
      const frame = searchMeta[object.__typename!]?.frame;
      if (frame) {
        onNavigate(createPath({ spaceKey: space!.key, frame: frame?.module.id, objectId: object.id }));
      }
    }
  };

  // TODO(burdon): Change to Intent (as below).
  const handleObjectAction = (action: ObjectAction) => {
    const { type, object } = action;
    switch (type) {
      case ObjectActionType.SELECT: {
        onNavigate(createPath({ spaceKey: space!.key, frame: frame?.module.id, objectId: object?.id }));
        break;
      }

      case ObjectActionType.DELETE: {
        invariant(object);
        space?.db.remove(object);
        break;
      }

      case ObjectActionType.RESTORE: {
        invariant(object);
        space?.db.add(object);
        break;
      }
    }
  };

  // TODO(burdon): Factor out intention handlers?
  const handleSpaceAction = (intent: Intent<SpaceListAction>) => {
    const space = spaces.find(({ key }) => key.equals(intent.data.spaceKey));
    invariant(space);

    switch (intent.action) {
      case IntentAction.SPACE_SELECT: {
        onNavigate(createPath({ spaceKey: intent.data.spaceKey, frame: frame?.module.id }));
        break;
      }

      case IntentAction.SPACE_SHARE: {
        startInvitation(space, intent.data.modifier);
        break;
      }
    }
  };

  const handleToggleConnection = async () => {
    switch (connectionState) {
      case ConnectionState.OFFLINE: {
        await client.mesh.updateConfig(ConnectionState.ONLINE);
        break;
      }

      case ConnectionState.ONLINE: {
        await client.mesh.updateConfig(ConnectionState.OFFLINE);
        break;
      }
    }
  };

  if (!space) {
    return null;
  }

  const Icon = getIcon(space.properties.icon);

  return (
    <Main.NavigationSidebar classNames={className}>
      <DensityProvider density='fine'>
        <div role='none' className={mx('flex flex-col w-full h-full overflow-hidden min-bs-full bg-sidebar-bg')}>
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
                  classNames='flex p-0 px-1'
                  data-testid='sidebar.showSpaceList'
                  onClick={() => setShowSpacePanel((show) => !show)}
                >
                  <Info className={getSize(5)} />
                </Button>
                <Button variant='ghost' classNames='p-0 pr-2' onClick={toggleNavigationSidebar}>
                  {navigationSidebarOpen && <CaretLeft className={getSize(6)} />}
                </Button>
              </div>
            </div>
          </div>

          {/* SpacePanel */}
          {showSpacePanel && (
            <SpaceListPanel
              onAction={handleSpaceAction}
              onNavigate={onNavigate}
              onClose={() => setShowSpacePanel(false)}
            />
          )}

          {/* Search/Frames */}
          {!showSpacePanel && (
            <div className='flex flex-col overflow-hidden space-y-2'>
              {(getOption('experimental.search') && (
                <SearchPanel space={space} onResults={handleSearchResults} onSelect={handleSearchSelect} />
              )) || <div className='mt-2' />}

              {/* Items if not actively searching. */}
              {!showSearchResults && (
                <FrameContent
                  showFrames={getOption('experimental.plugins')}
                  showDeletedObjects={showDeletedObjects}
                  handleObjectAction={handleObjectAction}
                />
              )}
            </div>
          )}

          <div className='flex-1' />
          <div className='flex shrink-0 flex-col my-2'>
            {/* Members */}
            <Separator />

            <MemberList onNavigate={onNavigate} />
            <div>
              <div className='pl-4'>
                <Button
                  variant='ghost'
                  data-testid='space-share'
                  title='Share space'
                  classNames='p-0 items-center'
                  onClick={(event) =>
                    handleSpaceAction({
                      action: IntentAction.SPACE_SHARE,
                      data: { spaceKey: space.key, modifier: event.getModifierState('Shift') },
                    })
                  }
                >
                  <Users className={getSize(6)} />
                  <div className='pl-2'>Manage Users</div>
                </Button>
              </div>
            </div>

            {/* Experimental */}
            {(getOption('experimental.plugins') ||
              getOption('experimental.functions') ||
              getOption('experimental.metagraph')) && (
              <>
                <Separator />

                {/* Frame registry dialog. */}
                <FrameRegistryDialog open={showFrames} onClose={() => setShowFrames(false)} />
                {getOption('experimental.plugins') && (
                  <div>
                    <Button
                      variant='ghost'
                      title='Select frame.'
                      classNames='mli-2 p-0 px-2 items-center'
                      onClick={() => setShowFrames(true)}
                    >
                      <PuzzlePiece className={getSize(6)} />
                      <div className='pl-2 text-sm'>Plugins</div>
                    </Button>
                  </div>
                )}

                {getOption('experimental.functions') && (
                  <div>
                    <Button
                      variant='ghost'
                      title='Show bot console.'
                      classNames='mli-2 p-0 px-2 items-center'
                      onClick={() => onNavigate(createPath({ spaceKey: space.key, section: Section.BOTS }))}
                    >
                      <Function className={getSize(6)} />
                      <div className='pl-2 text-sm'>Functions</div>
                    </Button>
                  </div>
                )}

                {getOption('experimental.metagraph') && (
                  <div>
                    <Button
                      variant='ghost'
                      title='Show metagraph.'
                      classNames='mli-2 p-0 px-2 items-center'
                      onClick={() => onNavigate(createPath({ spaceKey: space.key, section: Section.DMG }))}
                    >
                      <Graph className={getSize(6)} />
                      <div className='pl-2 text-sm'>Metagraph</div>
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Network */}
            <Separator />
            <div>
              <Button
                variant='ghost'
                title='Toggle connection state.'
                classNames='mli-2 p-0 px-2 items-center'
                onClick={handleToggleConnection}
              >
                {connectionState === ConnectionState.ONLINE ? (
                  <WifiHigh className={getSize(6)} />
                ) : (
                  <WifiSlash className={mx(getSize(6), 'text-selection-text')} />
                )}
                <span className='pl-2'>Toggle connection</span>
              </Button>
            </div>
          </div>
        </div>
      </DensityProvider>
    </Main.NavigationSidebar>
  );
};

Sidebar.displayName = SIDEBAR_NAME;

// TODO(burdon): Factor out.
const FrameContent = ({
  showFrames,
  showDeletedObjects,
  handleObjectAction,
}: {
  showFrames: boolean;
  showDeletedObjects?: boolean;
  handleObjectAction: (action: ObjectAction) => void;
}) => {
  const { space, frame } = useAppRouter(); // TODO(burdon): Factor out.
  const { Plugin } = frame?.runtime ?? {};

  if (!space) {
    return null;
  }

  const showObjects = !Plugin && frame?.runtime.filter;

  return (
    <div className='flex flex-col w-full overflow-y-scroll space-y-4'>
      {/* Frame list filter. */}
      {showFrames && <FrameList />}

      {(Plugin || showObjects) && (
        <div className='border-t border-b pt-2 pb-2'>
          {/* Generic object list. */}
          {!Plugin && frame?.runtime.filter && (
            <div className='flex w-full overflow-hidden'>
              <ObjectList frameDef={frame.runtime} showDeleted={showDeletedObjects} onAction={handleObjectAction} />
            </div>
          )}

          {/* Frame-specific plugin. */}
          {/* TODO(burdon): Plugin spec (space, onSelect). */}
          {Plugin && (
            <div className='flex w-full overflow-hidden'>
              <Suspense>
                <Plugin
                  space={space}
                  onSelect={(objectId: string | undefined) => {
                    const object = objectId ? space.db.getObjectById(objectId) : undefined;
                    handleObjectAction({ type: ObjectActionType.SELECT, object });
                  }}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
