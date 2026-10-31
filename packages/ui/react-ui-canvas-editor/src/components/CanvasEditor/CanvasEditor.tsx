//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { createContext } from '@dxos/react-hooks';
import { Canvas, type CanvasRootProps, type CanvasShellProps, useCanvasServices } from '@dxos/react-ui-canvas';

import { InspectorPanel } from '../panels/index.ts';
import { CanvasActions, CanvasCamera, CanvasDisplay, CanvasNavigation, CanvasTools } from './CanvasBars.tsx';
import {
  CanvasLayers,
  CanvasObjects,
  CanvasProperties,
  CanvasViews,
  useSelectionActions,
} from './CanvasInspectors.tsx';

/** Where the inspectors (properties, layers, about) sit: floating over the canvas, or docked in a column beside it. */
export type InspectorMode = 'floating' | 'docked';

export type CanvasEditorRootProps = Omit<CanvasRootProps, 'shell'> & {
  /** Where the inspectors sit: floating over the canvas (the default), or docked in a column beside it. */
  inspectors?: InspectorMode;
  /**
   * Called when the dock is closed or an inspector's menu docks or floats them; the dock's close button and the menu
   * item show only when given, as the host owns `inspectors`.
   */
  onInspectorsChange?: (mode: InspectorMode) => void;
};

type InspectorDock = Pick<CanvasEditorRootProps, 'inspectors' | 'onInspectorsChange'>;

const [InspectorDockProvider, useInspectorDock] = createContext<InspectorDock>('CanvasEditor.Root');

/** The engine's view inside the inspector panel, which the bars and inspectors below it register with. */
const CanvasEditorRoot = ({ inspectors = 'floating', onInspectorsChange, ...props }: CanvasEditorRootProps) => (
  <InspectorDockProvider inspectors={inspectors} onInspectorsChange={onInspectorsChange}>
    <Canvas.Root {...props} shell={InspectorShell} />
  </InspectorDockProvider>
);

CanvasEditorRoot.displayName = 'CanvasEditor.Root';

/** The inspector panel the view sits in: rendered inside the engine's providers, as its selection actions read them. */
const InspectorShell = ({ classNames, transparent, children }: CanvasShellProps) => {
  const { inspectors, onInspectorsChange } = useInspectorDock('CanvasEditor.Shell');
  const { draw, atoms, store, capabilities, readonly, controller } = useCanvasServices('CanvasEditor.Shell');
  const scene = useAtomValue(draw.scene);
  const selection = useAtomValue(atoms.selection);
  const actions = useSelectionActions({ scene, selection, store, capabilities, readonly, controller });
  const onDockedChange = useMemo(
    () => onInspectorsChange && ((docked: boolean) => onInspectorsChange(docked ? 'docked' : 'floating')),
    [onInspectorsChange],
  );
  return (
    <InspectorPanel.Root
      docked={!readonly && inspectors === 'docked'}
      readonly={readonly}
      actions={actions}
      onDockedChange={onDockedChange}
    >
      {/* The canvas beside the dock, which docked inspectors move into; with none docked, it takes no space. */}
      <InspectorPanel.Frame classNames={classNames} transparent={transparent}>
        {children}
      </InspectorPanel.Frame>
    </InspectorPanel.Root>
  );
};

InspectorShell.displayName = 'CanvasEditor.Shell';

/**
 * The standalone 2D canvas editor: the engine's view with its own bars and inspectors over its own store, for hosts
 * that draw a canvas outside `SceneEditor` (its e2e suites, samples).
 */
export const CanvasEditor = {
  Root: CanvasEditorRoot,
  Viewport: Canvas.Viewport,
  Navigation: CanvasNavigation,
  Actions: CanvasActions,
  Camera: CanvasCamera,
  Display: CanvasDisplay,
  Tools: CanvasTools,
  Properties: CanvasProperties,
  Views: CanvasViews,
  Layers: CanvasLayers,
  Objects: CanvasObjects,
};
