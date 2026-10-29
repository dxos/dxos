//
// Copyright 2026 DXOS.org
//

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type InspectorSectionDef, PROPERTIES_INSPECTOR } from '@dxos/react-ui-canvas';

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

/** The 3D inspectors: 2D's own Properties section first (the docked panel's upper half), the Library below it. */
export const SECTIONS_3D = {
  properties: PROPERTIES_INSPECTOR,
  library: { id: 'library', title: 'Library', icon: 'ph--package--regular', order: 1 },
} as const satisfies Record<string, InspectorSectionDef>;
