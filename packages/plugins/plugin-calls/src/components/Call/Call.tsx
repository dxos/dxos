//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { type PropsWithChildren, createContext, useContext } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { composable, composableProps } from '@dxos/react-ui';

import { useDebugMode } from '#hooks';
import { CallsCapabilities } from '#types';

import { type CallManager } from '../../calls';
import { AudioStream } from '../Media';
import { ParticipantGrid } from '../Participant';
import { Toolbar, type ToolbarProps } from './Toolbar';

//
// Root
//

const CALL_ROOT_NAME = 'Call.Root';

type CallContextValue = {
  call: CallManager;
  debug: boolean;
  fullscreen?: boolean;
};

const CallContext = createContext<CallContextValue | undefined>(undefined);

const useCallContext = (consumer: string): CallContextValue => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error(`${consumer} must be used within ${CALL_ROOT_NAME}.`);
  }
  return context;
};

type CallRootProps = PropsWithChildren<{ fullscreen?: boolean }>;

/**
 * Headless context provider. Resolves the call session once and shares it (plus debug/fullscreen
 * flags) with the composable parts below; renders no DOM of its own.
 */
const CallRoot = ({ children, fullscreen }: CallRootProps) => {
  const call = useCapability(CallsCapabilities.Manager);
  const debug = useDebugMode();
  return <CallContext.Provider value={{ call, debug, fullscreen }}>{children}</CallContext.Provider>;
};

CallRoot.displayName = CALL_ROOT_NAME;

//
// Viewport
//

const CALL_VIEWPORT_NAME = 'Call.Viewport';

/** Composable container for the call surface (participant grid + overlays). */
const CallViewport = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => (
  // `group` anchors the auto-hiding toolbar's `group-hover` reveal (see Call/Lobby `Toolbar`). Without a
  // `.group` ancestor the controls stay `opacity-0` forever; this restores what the removed `Lobby.Root` provided.
  <div {...composableProps(props, { classNames: 'relative dx-container flex flex-col group' })} ref={forwardedRef}>
    {children}
  </div>
));

CallViewport.displayName = CALL_VIEWPORT_NAME;

//
// Audio
//

// Resolves the manager directly (not via Call.Root): audio playback is global and is mounted at
// the app root (react-root) outside any Call.Root.
const CallAudio = () => {
  const call = useCapability(CallsCapabilities.Manager);
  const audioTracksToPlay = useAtomValue(call.audioTracksToPlayAtom);
  return <AudioStream tracks={audioTracksToPlay} />;
};

CallAudio.displayName = 'Call.Audio';

//
// Grid
//

const CallGrid = () => {
  const { call, debug, fullscreen } = useCallContext('Call.Grid');
  const self = useAtomValue(call.selfAtom);
  const users = useAtomValue(call.usersAtom);

  return (
    <div className='grid grow p-4 dark:bg-neutral-900'>
      <ParticipantGrid self={self} users={users} debug={debug} fullscreen={fullscreen} />
    </div>
  );
};

CallGrid.displayName = 'Call.Grid';

//
// Toolbar
//

type CallToolbarProps = Pick<ToolbarProps, 'channel' | 'onJoin' | 'onLeave'>;

const CallToolbar = (props: CallToolbarProps) => (
  <div className='absolute bottom-0 left-0 right-0 flex justify-center'>
    <Toolbar isInRoom {...props} />
  </div>
);

CallToolbar.displayName = 'Call.Toolbar';

//
// Export
//

export const Call = {
  Root: CallRoot,
  Viewport: CallViewport,
  Audio: CallAudio,
  Grid: CallGrid,
  Toolbar: CallToolbar,
};

export type { CallRootProps, CallToolbarProps };
