//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { StatusBar } from '@dxos/plugin-status-bar/components';
import { type DebugPortController, getDebugPortController } from '@dxos/react-client/devtools';
import {
  FloatingPanel,
  type FloatingPanelPoint,
  type FloatingPanelSize,
  IconButton,
  useTranslation,
} from '@dxos/react-ui';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';

import { meta } from '#meta';

import {
  DEBUG_PANEL_CONTEXT,
  DebugPanel,
  DebugPanelHeader,
  type DebugPanelMode,
  debugPanelAspect,
} from '../DebugPanel/index.ts';

/** Room for the log table to breathe; the console fits itself to whatever it is given. */
const DEFAULT_SIZE: FloatingPanelSize = { width: 1024, height: 384 };

const MIN_SIZE: FloatingPanelSize = { width: 480, height: 240 };

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
    (next: FloatingPanelPoint) => update((prev) => ({ ...prev, position: next })),
    [update],
  );

  const handleSizeChangeEnd = useCallback(
    (next: FloatingPanelSize) => update((prev) => ({ ...prev, size: next })),
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
    <FloatingPanel.Root
      open={mode === 'floating' && floatingOpen}
      onOpenChange={setFloatingOpen}
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
          <FloatingPanel.Trigger asChild>
            <IconButton variant='ghost' icon='ph--terminal-window--regular' iconOnly label={label} />
          </FloatingPanel.Trigger>
        ) : (
          <IconButton
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
      <FloatingPanel.Portal>
        <FloatingPanel.Content>
          <DebugPanel.Root>
            <FloatingPanel.Header classNames='pl-1'>
              <FloatingPanel.DragTrigger>
                <FloatingPanel.Title>{t('debug-panel.title')}</FloatingPanel.Title>
              </FloatingPanel.DragTrigger>
              {/* Fold and restore only: a debug panel over the whole app is a window the reader would resize. */}
              <FloatingPanel.Control>
                <DebugPanelHeader mode={mode} onModeChange={handleModeChange} density='sm' />
                <FloatingPanel.StageTrigger stage='minimized' />
                <FloatingPanel.StageTrigger stage='default' />
                <FloatingPanel.CloseTrigger />
              </FloatingPanel.Control>
            </FloatingPanel.Header>
            <FloatingPanel.Body classNames='grid'>
              <DebugPanel.Body />
            </FloatingPanel.Body>
          </DebugPanel.Root>
          <FloatingPanel.Resizers />
        </FloatingPanel.Content>
      </FloatingPanel.Portal>
    </FloatingPanel.Root>
  );
};

DebugPanelStatus.displayName = 'DebugPanelStatus';
