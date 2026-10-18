//
// Copyright 2026 DXOS.org
//

import { type ReactNode, useMemo } from 'react';

import { type DockSection, useDockSection } from './Dock.tsx';
import { useSceneViewContext } from './SceneViewContext.ts';

/**
 * An inspector: a panel beside the canvas (properties, layers, about) that docks as one section of the dock or floats
 * over the canvas. Floating, it shows while the selection is non-empty (`selection`), empty (`empty`), or never.
 */
export type InspectorDef = DockSection & { float: 'selection' | 'empty' | 'never' };

/** What an inspector's panel takes from where it sits. */
export type InspectorChrome = {
  docked: boolean;
  classNames: string;
  /** Docks or floats every inspector; absent when the host does not offer the choice. */
  onDockedChange?: (docked: boolean) => void;
};

/**
 * Places an inspector's panel in its section of the dock, whose one scrolling column holds the inspectors whether it
 * sits beside the canvas (docked) or floats over it. Floating, a section shows while `def.float` says so; read-only,
 * none does, as the inspectors edit the scene.
 */
export const useInspector = (def: InspectorDef, render: (chrome: InspectorChrome) => ReactNode): ReactNode | null => {
  const { readonly, selection, inspectors, onInspectorsChange } = useSceneViewContext('SceneView.Inspector');
  const docked = inspectors === 'docked';
  const onDockedChange = useMemo(
    () => onInspectorsChange && ((next: boolean) => onInspectorsChange(next ? 'docked' : 'floating')),
    [onInspectorsChange],
  );
  const floats =
    !readonly &&
    (def.float === 'selection' ? selection.size > 0 : def.float === 'empty' ? selection.size === 0 : false);
  const panel = render({ docked, classNames: 'h-auto', onDockedChange });
  return useDockSection(def, docked || floats, panel);
};
