//
// Copyright 2026 DXOS.org
//

import React, { useEffect } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { NotFound, Paths } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { type ModuleProps } from '@dxos/story-modules';

import { useActiveObject } from '../testing';

/**
 * Renders the current context object as its Article surface — for a Markdown document this is the
 * live editor (`MarkdownArticle`), so agent edits are visible and reactive alongside the chat.
 */
export const DocumentModule = ({ space }: ModuleProps) => {
  const { graph } = useAppGraph();
  const object = useActiveObject(space);
  // The object is a child of the space root collection, so its app-graph node id is the collections
  // path. The editor's toolbar actions (e.g. the comment button) are graph actions on that node;
  // expand the path to materialize the node and its actions — the work the deck's navtree normally
  // does on navigation. Attention + the surface are scoped to the same node id.
  const attendableId = object ? Paths.getCollectionsPath(space.id, object.id) : undefined;
  useEffect(() => {
    if (attendableId) {
      NotFound.expandPath(graph, attendableId);
    }
  }, [graph, attendableId]);

  const attentionAttrs = useAttentionAttributes(attendableId);
  if (!object || !attendableId) {
    return null;
  }

  return (
    <div className='contents' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={{ subject: object, attendableId }} limit={1} />
    </div>
  );
};
