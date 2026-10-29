//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { LAYERS_INSPECTOR, OBJECTS_INSPECTOR, PROPERTIES_INSPECTOR, VIEWS_INSPECTOR } from '@dxos/react-ui-canvas';

import { SECTIONS_3D, display2D, grid3D, sceneChrome } from './scene-chrome.ts';

describe('sceneChrome', () => {
  test('only an article edits and draws the grid and guides', () => {
    expect(sceneChrome(AppSurface.Article.role)).toEqual({ editing: true, grid: true });
  });

  test('a card, section or slide is a picture: no chrome, no grid, no guides', () => {
    for (const role of [AppSurface.CardContent.role, AppSurface.Section.role, AppSurface.Slide.role]) {
      expect(sceneChrome(role)).toEqual({ editing: false, grid: false });
    }
  });

  test('with no role, a canvas is shown as a picture', () => {
    expect(sceneChrome(undefined)).toEqual({ editing: false, grid: false });
  });

  test('2D: a card, section or slide draws no grid or guides whatever the viewer set', () => {
    const viewer = { snap: true, guides: true, fit: true };
    expect(display2D(AppSurface.Article.role, viewer)).toEqual(viewer);
    for (const role of [AppSurface.CardContent.role, AppSurface.Section.role, AppSurface.Slide.role]) {
      expect(display2D(role, viewer)).toEqual({ snap: false, guides: false, fit: true });
    }
  });

  test('3D: a card, section or slide draws no ground grid whatever the viewer set', () => {
    expect(grid3D(AppSurface.Article.role, true)).toBe(true);
    expect(grid3D(AppSurface.Article.role, false)).toBe(false);
    for (const role of [AppSurface.CardContent.role, AppSurface.Section.role, AppSurface.Slide.role]) {
      expect(grid3D(role, true)).toBe(false);
    }
  });

  test("3D's inspector sections are 2D's own: Properties first, then Views, Objects and Layers", () => {
    expect(SECTIONS_3D).toEqual({
      properties: PROPERTIES_INSPECTOR,
      views: VIEWS_INSPECTOR,
      objects: OBJECTS_INSPECTOR,
      layers: LAYERS_INSPECTOR,
    });
    expect(SECTIONS_3D.properties).toMatchObject({ order: 0, pane: 'upper', defaultOpen: true });
  });
});
