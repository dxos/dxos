//
// Copyright 2026 DXOS.org
//

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import {
  type InspectorSectionDef,
  LAYERS_INSPECTOR,
  OBJECTS_INSPECTOR,
  PROPERTIES_INSPECTOR,
  VIEWS_INSPECTOR,
} from '@dxos/react-ui-canvas';

/** What a scene shows in a role: its editing chrome (tools, actions, inspectors, display panel), and its grid and guides. */
export type SceneChrome = { editing: boolean; grid: boolean };

/**
 * Only the article edits a scene; a card, section or slide shows it as a picture, so it draws no chrome, grid or
 * guides whatever the viewer's own grid setting says.
 */
export const sceneChrome = (role: string | undefined): SceneChrome => {
  const article = role === AppSurface.Article.role;
  return { editing: article, grid: article };
};

/** The 2D engine's display in a role: the viewer's grid (the engine's snap draws it) and guides only in an article. */
export const display2D = <D extends { snap?: boolean; guides?: boolean }>(role: string | undefined, display: D): D => {
  const { grid } = sceneChrome(role);
  return grid ? display : { ...display, snap: false, guides: false };
};

/** Whether a 3D view draws its ground grid in a role: the viewer's setting, only in an article. */
export const grid3D = (role: string | undefined, grid: boolean): boolean => sceneChrome(role).grid && grid;

/** The 3D inspectors are 2D's own sections, so both dimensions stack the same panel. */
export const SECTIONS_3D: Readonly<Record<'properties' | 'views' | 'objects' | 'layers', InspectorSectionDef>> = {
  properties: PROPERTIES_INSPECTOR,
  views: VIEWS_INSPECTOR,
  objects: OBJECTS_INSPECTOR,
  layers: LAYERS_INSPECTOR,
};
