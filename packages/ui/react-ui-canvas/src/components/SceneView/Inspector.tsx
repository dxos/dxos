//
// Copyright 2026 DXOS.org
//

import { type ReactNode, useMemo } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { type DockSection, useDockSection } from './Dock.tsx';
import { useSceneViewContext } from './SceneViewContext.ts';

/** Where a floating inspector sits: the top right, sized to its content up to the view's height. */
export const INSPECTOR_CLASSES = 'absolute top-2 right-2 w-80 h-auto max-h-[calc(100%-1rem)]';

const FLOATING_CHROME = 'rounded-sm bg-modal-surface border border-separator';

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
 * Places an inspector's panel: docked, into its section of the dock; floating, over the canvas when `def.float` says
 * so; read-only, nowhere, as the inspectors edit the scene.
 */
export const useInspector = (
  def: InspectorDef,
  render: (chrome: InspectorChrome) => ReactNode,
  classNames: Util.ThemedClassName<{}>['classNames'] = INSPECTOR_CLASSES,
): ReactNode | null => {
  const { readonly, selection, inspectors, onInspectorsChange } = useSceneViewContext('SceneView.Inspector');
  const docked = inspectors === 'docked';
  const onDockedChange = useMemo(
    () => onInspectorsChange && ((next: boolean) => onInspectorsChange(next ? 'docked' : 'floating')),
    [onInspectorsChange],
  );
  const panel = render({ docked, classNames: docked ? 'h-auto' : mx(FLOATING_CHROME, classNames), onDockedChange });
  const dockedPanel = useDockSection(def, docked, panel);
  if (docked) {
    return dockedPanel;
  }
  if (readonly) {
    return null;
  }
  switch (def.float) {
    case 'selection':
      return selection.size > 0 ? panel : null;
    case 'empty':
      return selection.size === 0 ? panel : null;
    case 'never':
      return null;
  }
};
