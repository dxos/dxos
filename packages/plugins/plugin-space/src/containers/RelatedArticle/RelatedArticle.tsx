//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Masonry } from '@dxos/react-ui-masonry';
import { Next } from '@dxos/react-ui/next';

import { ObjectCard, RelatedTypeFilter } from '#components';
import { useRelatedObjects, useRelatedTypeFilter } from '#hooks';

export type RelatedArticleProps = Pick<
  AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>,
  'role' | 'companionTo'
>;

export const RelatedArticle = ({ role, companionTo }: RelatedArticleProps) => {
  const db = Obj.getDatabase(companionTo);
  const related = useRelatedObjects(db, companionTo, { references: true, relations: true });
  // Keyed by the record, not this article, so the record's inline section shares the same filter.
  const contextId = companionTo && Obj.getURI(companionTo).toString();
  const { types, items, toggle } = useRelatedTypeFilter(related, contextId);

  return (
    <Masonry.Root Tile={ObjectCard}>
      <Next.Panel.Root role={role}>
        {/* TODO(burdon): Build this out into a real toolbar: text filter, and a table/card view
            toggle as TypeArticle has. */}
        <Next.Panel.Header>
          <Next.Toolbar.Root>
            <RelatedTypeFilter types={types} onToggle={toggle} />
          </Next.Toolbar.Root>
        </Next.Panel.Header>
        <Next.Panel.Body asChild>
          <Masonry.Content>
            <Masonry.Viewport items={items} />
          </Masonry.Content>
        </Next.Panel.Body>
      </Next.Panel.Root>
    </Masonry.Root>
  );
};

RelatedArticle.displayName = 'RelatedArticle';
