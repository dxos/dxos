//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useSyncExternalStore } from 'react';

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

import { DEBUG_PANEL_CONTEXT, DebugPanel, debugPanelAspect } from '../DebugPanel';

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
 * Status-bar button opening the debug panel as a floating window over the whole app: dragged,
 * resized, folded to its title bar as the session needs, and left where it was put across reloads. The
 * red dot marks a live agent debug port — an agent can evaluate code in this page — so it must be
 * visible without opening settings.
 */
export const DebugPanelStatus = ({ controller = getDebugPortController() }: DebugPanelStatusProps) => {
  const { t } = useTranslation(meta.profile.key);
  const subscribe = useCallback((listener: () => void) => controller.subscribe(listener), [controller]);
  const getStatus = useCallback(() => controller.getStatus(), [controller]);
  const status = useSyncExternalStore(subscribe, getStatus);
  const { position, size = DEFAULT_SIZE } = useViewState(debugPanelAspect, DEBUG_PANEL_CONTEXT);
  const { update } = useViewStateActions(debugPanelAspect, DEBUG_PANEL_CONTEXT);
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
        <FloatingPanel.Trigger asChild>
          <IconButton
            variant='ghost'
            icon='ph--terminal-window--regular'
            iconOnly
            label={status.running ? t('debug-port-status.running.label') : t('open-debug-panel.label')}
          />
        </FloatingPanel.Trigger>
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
          <FloatingPanel.Header>
            <FloatingPanel.DragTrigger>
              <FloatingPanel.Title>{t('debug-panel.title')}</FloatingPanel.Title>
            </FloatingPanel.DragTrigger>
            {/* Fold and restore only: a debug panel over the whole app is a window the reader would resize. */}
            <FloatingPanel.Control>
              <FloatingPanel.StageTrigger stage='minimized' />
              <FloatingPanel.StageTrigger stage='default' />
              <FloatingPanel.CloseTrigger />
            </FloatingPanel.Control>
          </FloatingPanel.Header>
          <FloatingPanel.Body>
            <DebugPanel />
          </FloatingPanel.Body>
          <FloatingPanel.Resizers />
        </FloatingPanel.Content>
      </FloatingPanel.Portal>
    </FloatingPanel.Root>
  );
};

DebugPanelStatus.displayName = 'DebugPanelStatus';
