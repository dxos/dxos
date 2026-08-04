//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { isSpace } from '@dxos/client/echo';

import { ArtifactsArticle } from '#containers';

export type ArtifactsArticleSurfaceProps = {
  role: string;
  attendableId?: string;
  /** The navtree node's properties bag, which carries the space for this virtual node. */
  properties?: Record<string, unknown>;
};

/** The browse/create hub is bound by a data sentinel, so its space arrives via the node's properties. */
export const ArtifactsArticleSurface = ({ role, attendableId, properties }: ArtifactsArticleSurfaceProps) => {
  const space = isSpace(properties?.space) ? properties.space : undefined;

  return space ? <ArtifactsArticle role={role} space={space} attendableId={attendableId} /> : null;
};
