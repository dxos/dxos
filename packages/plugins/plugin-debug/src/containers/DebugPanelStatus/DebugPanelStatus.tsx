//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { StatusBar } from '@dxos/plugin-status-bar/components';
import { type DebugPortController, getDebugPortController } from '@dxos/react-client/devtools';
import { useTranslation } from '@dxos/react-ui';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';

import {
  DEBUG_PANEL_CONTEXT,
  DebugPanel,
  DebugPanelHeader,
  type DebugPanelMode,
  debugPanelAspect,
} from '../DebugPanel/index.ts';

/** Room for the log table to breathe; the console fits itself to whatever it is given. */
const DEFAULT_SIZE: Next.FloatingPanelSize = { width: 1024, height: 384 };

const MIN_SIZE: Next.FloatingPanelSize = { width: 480, height: 240 };

/** Clear of the status bar the panel opens from. */
const MARGIN = 8;

export type DebugPanelStatusProps = {
  /** Injectable for stories/tests; defaults to the page-wide controller. */
  controller?: DebugPortController;
};

/**
 * Status-bar button showing the debug panel: docked, it toggles the deck's bottom drawer; floating,
 * it opens the panel as a window over the whole app — dragged, resized, folded to its title bar as
 * the session needs, and left where it was put across reloads. The red dot marks a live agent debug
 * port — an agent can evaluate code in this page — so it must be visible without opening settings.
 */
export const DebugPanelStatus = ({ controller = getDebugPortController() }: DebugPanelStatusProps) => {
  const { t } = useTranslation(meta.profile.key);
  const subscribe = useCallback((listener: () => void) => controller.subscribe(listener), [controller]);
  const getStatus = useCallback(() => controller.getStatus(), [controller]);
  const status = useSyncExternalStore(subscribe, getStatus);
  const { invokePromise } = useOperationInvoker();

  const { position, size = DEFAULT_SIZE, mode = 'docked' } = useViewState(debugPanelAspect, DEBUG_PANEL_CONTEXT);
  const { update } = useViewStateActions(debugPanelAspect, DEBUG_PANEL_CONTEXT);
  const label = status.running ? t('debug-port-status.running.label') : t('open-debug-panel.label');

  // Owned here rather than by the window so the drawer's float control can open it: the drawer
  // only flips the persisted mode, and a docked-to-floating flip while mounted is that request.
  const [floatingOpen, setFloatingOpen] = useState(false);
  const previousModeRef = useRef(mode);
  useEffect(() => {
    if (previousModeRef.current === 'docked' && mode === 'floating') {
      setFloatingOpen(true);
    }
    previousModeRef.current = mode;
  }, [mode]);

  const handleToggleDrawer = useCallback(
    () => void invokePromise(LayoutOperation.UpdateDrawer, { state: 'toggle' }),
    [invokePromise],
  );
  // Docking moves the panel: the window closes before the drawer opens so the two never show at once.
  const handleModeChange = useCallback(
    (next: DebugPanelMode) => {
      setFloatingOpen(false);
      update((prev) => ({ ...prev, mode: next }));
      if (next === 'docked') {
        void invokePromise(LayoutOperation.UpdateDrawer, { state: 'open' });
      }
    },
    [update, invokePromise],
  );
  const handlePositionChangeEnd = useCallback(
    ({ position }: { position: Next.FloatingPanelPoint }) => update((prev) => ({ ...prev, position })),
    [update],
  );

  const handleSizeChangeEnd = useCallback(
    ({ size }: { size: Next.FloatingPanelSize }) => update((prev) => ({ ...prev, size })),
    [update],
  );
  // First opening: centred above the status bar, where the popover it replaces used to sit. A
  // persisted position wins from then on.
  const getAnchorPosition = useCallback(
    ({ triggerRect, boundaryRect }: { triggerRect: DOMRect | null; boundaryRect: DOMRect | null }) => {
      if (position) {
        return position;
      }
      const bounds = boundaryRect ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      const bottom = triggerRect?.top ?? bounds.bottom;
      return {
        x: Math.max(0, bounds.left + (bounds.width - size.width) / 2),
        y: Math.max(0, bottom - size.height - MARGIN),
      };
    },
    [position, size],
  );

  return (
    <Next.FloatingPanel.Root
      open={mode === 'floating' && floatingOpen}
      onOpenChange={({ open }) => setFloatingOpen(open)}
      defaultSize={size}
      minSize={MIN_SIZE}
      getAnchorPosition={getAnchorPosition}
      persistRect
      closeOnEscape
      onPositionChangeEnd={handlePositionChangeEnd}
      onSizeChangeEnd={handleSizeChangeEnd}
    >
      {/* IconButton is the direct trigger child so the trigger ref/handlers/ARIA attach to the button, not the container. */}
      <StatusBar.Item classNames='relative'>
        {mode === 'floating' ? (
          <Next.FloatingPanel.Trigger asChild>
            <Next.Button variant='ghost' icon='ph--terminal-window--regular' iconOnly label={label} />
          </Next.FloatingPanel.Trigger>
        ) : (
          <Next.Button
            variant='ghost'
            icon='ph--terminal-window--regular'
            iconOnly
            label={label}
            onClick={handleToggleDrawer}
          />
        )}
        {status.running && (
          <span
            role='status'
            aria-label={t('debug-port-status.running.label')}
            data-testid='debugPlugin.portIndicator'
            className='absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 pointer-events-none'
          />
        )}
      </StatusBar.Item>
      <Next.FloatingPanel.Content>
        <DebugPanel.Root>
          <Next.FloatingPanel.Header classNames='pl-1'>
            <Next.FloatingPanel.DragTrigger>
              <Next.FloatingPanel.Title>{t('debug-panel.title')}</Next.FloatingPanel.Title>
            </Next.FloatingPanel.DragTrigger>
            {/* Fold and restore only: a debug panel over the whole app is a window the reader would resize. */}
            <Next.FloatingPanel.Control>
              <DebugPanelHeader mode={mode} onModeChange={handleModeChange} size='sm' />
              <Next.FloatingPanel.StageTrigger stage='minimized' />
              <Next.FloatingPanel.StageTrigger stage='default' />
              <Next.FloatingPanel.CloseTrigger />
            </Next.FloatingPanel.Control>
          </Next.FloatingPanel.Header>
          <Next.FloatingPanel.Body classNames='grid'>
            <DebugPanel.Body />
          </Next.FloatingPanel.Body>
        </DebugPanel.Root>
      </Next.FloatingPanel.Content>
    </Next.FloatingPanel.Root>
  );
};

DebugPanelStatus.displayName = 'DebugPanelStatus';
