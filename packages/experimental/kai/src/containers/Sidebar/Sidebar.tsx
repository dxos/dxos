//
// Copyright 2022 DXOS.org
//

import { AppWindow, CaretLeft, Info, Graph, Robot, UserPlus, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import assert from 'assert';
import React, { useContext, useEffect, useState, Suspense } from 'react';
import { Link } from 'react-router-dom';

import { Button, DensityProvider } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { TypedObject } from '@dxos/client';
import { searchMeta } from '@dxos/kai-frames';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { observer, useClient, useKeyStore, useNetworkStatus, useSpaces } from '@dxos/react-client';
import { PanelSidebarContext, useTogglePanelSidebar } from '@dxos/react-shell';

import { SpaceListAction } from '../../components';
import { FrameRegistryDialog } from '../../containers';
import {
  Section,
  SearchResults,
  bool,
  createPath,
  getIcon,
  optionsKeys,
  useAppRouter,
  useAppState,
  useCreateInvitation,
  useTheme
} from '../../hooks';
import { Intent, IntentAction } from '../../util';
import { MemberList } from '../MembersList';
import { SearchPanel } from '../SearchPanel';
import { FrameList } from './FrameList';
import { ObjectAction, ObjectActionType, ObjectList } from './ObjectList';
import { Separator, SpacePanel } from './SpacePanel';

export type SidebarProps = {
  onNavigate: (path: string) => void;
};

// TODO(burdon): Remove observer?
// TODO(burdon): Split into sub-components.
export const Sidebar = observer(({ onNavigate }: SidebarProps) => {
  // TODO(burdon): Factor out app state/nav.
  const { space, section, frame, objectId } = useAppRouter(); // TODO(burdon): Factor out.
  const { showDeletedObjects } = useAppState();
  const [options] = useKeyStore(optionsKeys);

  const theme = useTheme();
  const client = useClient();
  const spaces = useSpaces();
  const startInvitation = useCreateInvitation();

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

  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);
  const { state: connectionState } = useNetworkStatus();
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
        assert(object);
        space?.db.remove(object);
        break;
      }

      case ObjectActionType.RESTORE: {
        assert(object);
        space?.db.add(object);
        break;
      }
    }
  };

  // TODO(burdon): Factor out intention handlers?
  const handleSpaceAction = (intent: Intent<SpaceListAction>) => {
    const space = spaces.find(({ key }) => key.equals(intent.data.spaceKey));
    assert(space);

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
                className='flex p-0 px-1'
                data-testid='sidebar.showSpaceList'
                onClick={() => setShowSpacePanel((show) => !show)}
              >
                <Info className={getSize(5)} />
              </Button>
              <Button variant='ghost' className='p-0 pr-2' onClick={toggleSidebar}>
                {displayState === 'show' && <CaretLeft className={getSize(6)} />}
              </Button>
            </div>
          </div>
        </div>

        {/* SpacePanel */}
        {showSpacePanel && (
          <SpacePanel onAction={handleSpaceAction} onNavigate={onNavigate} onClose={() => setShowSpacePanel(false)} />
        )}

        {/* Search/Frames */}
        {!showSpacePanel && (
          <div className='flex flex-col overflow-hidden space-y-2'>
            {(bool(options.get('experimental.search')) && (
              <SearchPanel space={space} onResults={handleSearchResults} onSelect={handleSearchSelect} />
            )) || <div className='mt-2' />}

            {/* Items if not actively searching. */}
            {!showSearchResults && (
              <FrameContent showDeletedObjects={showDeletedObjects} handleObjectAction={handleObjectAction} />
            )}
          </div>
        )}

        <div className='flex-1' />
        <div className='flex shrink-0 flex-col my-2'>
          {/* Members */}
          <div>
            <div className='pl-2'>
              <Button
                data-testid='space-share'
                variant='ghost'
                title='Share space'
                onClick={(event) =>
                  handleSpaceAction({
                    action: IntentAction.SPACE_SHARE,
                    data: { spaceKey: space.key, modifier: event.getModifierState('Shift') }
                  })
                }
              >
                <UserPlus className={getSize(6)} />
              </Button>
            </div>

            <MemberList onNavigate={onNavigate} />
          </div>

          {/* Experimental */}
          {(bool(options.get('experimental.bots')) || bool(options.get('experimental.metagraph'))) && (
            <>
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
            </>
          )}

          {/* Network */}
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
      </div>
    </DensityProvider>
  );
});

// TODO(burdon): Factor out.
const FrameContent = ({
  showDeletedObjects,
  handleObjectAction
}: {
  showDeletedObjects?: boolean;
  handleObjectAction: (action: ObjectAction) => void;
}) => {
  const [options] = useKeyStore(optionsKeys);
  const { space, frame } = useAppRouter(); // TODO(burdon): Factor out.
  const [showFrames, setShowFrames] = useState(false);
  const { Plugin } = frame?.runtime ?? {};

  if (!space) {
    return null;
  }

  return (
    <div className='overflow-y-scroll space-y-4'>
      {/* Frame list filter. */}
      {bool(options.get('experimental.frames')) && <FrameList />}

      {/* Generic object list. */}
      {!Plugin && frame?.runtime.filter && (
        <ObjectList frameDef={frame.runtime} showDeleted={showDeletedObjects} onAction={handleObjectAction} />
      )}

      {/* Frame-specific plugin. */}
      {/* TODO(burdon): Plugin spec (space, onSelect). */}
      {Plugin && (
        <Suspense>
          <Plugin
            space={space}
            onSelect={(objectId: string | undefined) => {
              const object = objectId ? space.db.getObjectById(objectId) : undefined;
              handleObjectAction({ type: ObjectActionType.SELECT, object });
            }}
          />
        </Suspense>
      )}

      {/* Frame registry dialog. */}
      <FrameRegistryDialog open={showFrames} onClose={() => setShowFrames(false)} />
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
  );
};
