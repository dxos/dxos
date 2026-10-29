//
// Copyright 2026 DXOS.org
//

import { Migration } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { Canvas } from '#types';

import { upgradeSceneContent } from './content.ts';

const isContentMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * `dxos.org/scene/1` -> `dxos.org/scene/2`: every record written back in the shape the read-time upgrades
 * (`upgradeSceneContent`) give it, since any version-1 drawing may hold any of the legacy shapes.
 */
export const sceneV1ToV2 = Migration.defineContent({
  type: Drawing.Canvas,
  from: Canvas.SCENE_SCHEMA_V1,
  to: Canvas.SCENE_SCHEMA,
  since: '0.17.0',
  transform: ({ content, styles }) => ({
    content: isContentMap(content) ? upgradeSceneContent(content) : content,
    styles,
  }),
});

/** The scene format's content steps, oldest first. */
export const SceneMigrations: readonly Migration.Migration[] = [sceneV1ToV2];
