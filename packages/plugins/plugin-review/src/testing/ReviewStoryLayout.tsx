//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading } from '@dxos/react-ui/testing';

/** The companions a review story shows beside the editor, top to bottom. */
export type ReviewStoryPanel = 'comments' | 'history';

export type ReviewStoryLayoutProps = {
  /** Defaults to the review companion plus the version timeline. */
  panels?: ReviewStoryPanel[];
  /**
   * Attention/companion scope. Defaults to the document's URI; stories that drive the app graph pass
   * the graph-qualified id instead so contributed node actions resolve against the same subject.
   */
  attendableId?: string;
};

/**
 * Shared layout for the review stories: the document's article surface beside its companions. Stories
 * differ only in what they seed and which panels they ask for, so the wiring — resolving the seeded
 * document, establishing the attention scope, splitting the columns — lives here rather than being
 * copied per story file. Companions render through `Surface` rather than by mounting the containers
 * directly, so the stories exercise the same companion resolution the app uses.
 */
export const ReviewStoryLayout = ({ panels = ['comments', 'history'], attendableId }: ReviewStoryLayoutProps) => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const id = attendableId ?? (doc ? Obj.getURI(doc) : undefined);

  // Establish the attention scope for `id` so the editor toolbar's attendable-scoped menu actions
  // resolve (a bare Surface has no attended element for the toolbar's `Menu.Root` to bind to).
  const attentionAttrs = useAttentionAttributes(id);
  const articleData = useMemo(() => ({ subject: doc, attendableId: id ?? 'story' }), [doc, id]);
  const companionData = useMemo(
    () => panels.map((panel) => ({ subject: panel, companionTo: doc, attendableId: id ?? 'story' })),
    [panels, doc, id],
  );
  if (!doc || !id) {
    return <Loading />;
  }

  return (
    <div className='dx-container grid grid-cols-[3fr_2fr]' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={articleData} limit={1} />
      <div
        className='grid min-h-0 divide-y divide-separator'
        style={{ gridTemplateRows: `repeat(${companionData.length}, minmax(0, 1fr))` }}
      >
        {companionData.map((data) => (
          <Surface.Surface key={data.subject} type={AppSurface.Article} data={data} limit={1} />
        ))}
      </div>
    </div>
  );
};
