//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Markdown } from '@dxos/plugin-markdown/types';
import { useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading } from '@dxos/react-ui/testing';

import { CommentsArticle, ObjectHistory } from '../containers';

/** The companions a review story shows beside the editor, left to right. */
export type ReviewStoryPanel = 'comments' | 'history';

export type ReviewStoryLayoutProps = {
  /** Defaults to the review companion plus the version timeline. */
  panels?: ReviewStoryPanel[];
};

/**
 * Shared layout for the review stories: the document's article surface beside its companions. Stories
 * differ only in what they seed and which panels they ask for, so the wiring — resolving the seeded
 * document, establishing the attention scope, splitting the columns — lives here rather than being
 * copied per story file.
 */
export const ReviewStoryLayout = ({ panels = ['comments', 'history'] }: ReviewStoryLayoutProps) => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const id = doc ? Obj.getURI(doc) : undefined;

  // Establish the attention scope for `id` so the editor toolbar's attendable-scoped menu actions
  // resolve (a bare Surface has no attended element for the toolbar's `Menu.Root` to bind to).
  const attentionAttrs = useAttentionAttributes(id);
  if (!doc || !id) {
    return <Loading />;
  }

  return (
    <div
      className='dx-container grid divide-x divide-separator'
      style={{ gridTemplateColumns: `repeat(${panels.length + 1}, minmax(0, 1fr))` }}
    >
      <div className='contents' {...attentionAttrs}>
        <Surface.Surface type={AppSurface.Article} data={{ subject: doc, attendableId: id }} limit={1} />
      </div>
      {panels.map((panel) =>
        panel === 'comments' ? (
          <CommentsArticle key={panel} role='article' subject={doc} attendableId={id} />
        ) : (
          <ObjectHistory key={panel} role='article' subject={doc} attendableId={id} />
        ),
      )}
    </div>
  );
};
