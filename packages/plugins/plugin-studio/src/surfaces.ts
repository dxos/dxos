//
// Copyright 2026 DXOS.org
//

import { Role } from '@dxos/app-framework';
import { type Obj, type Ref } from '@dxos/echo';

import { type Generation } from './types';

/**
 * The renderable content of a variant, decoupled from the ECHO object (works for both a live object
 * and a snapshot). `contentType` selects the renderer; `url`/`content` carry the asset.
 */
export type VariantContent = {
  contentType?: string;
  url?: string;
  content?: Ref.Ref<Obj.Unknown>;
  generation?: Generation.Generation;
};

/**
 * Role token for rendering a single variant's content, filtered by `contentType`. Studio ships
 * defaults (`image/*` → `<img>`, `video/*` → `<video>`); a plugin overrides for a contentType via a
 * higher-priority (`Position.first`) surface.
 */
export const VariantRenderer: Role.Role<{
  variant: VariantContent;
  contentType: string;
}> = Role.make('org.dxos.plugin.studio.role.variantRenderer');
