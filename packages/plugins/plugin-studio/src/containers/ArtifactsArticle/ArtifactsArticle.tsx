//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Filter, type Obj } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { DropdownMenu, Icon, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { ArtifactCard } from '#components';
import { meta } from '#meta';
import { Artifact } from '#types';

type Kind = 'image' | 'video';

type TileData = {
  artifact: Artifact.Artifact;
};

const ArtifactTile = ({ data }: { data?: TileData }) => {
  if (!data) {
    return null;
  }
  return <ArtifactCard subject={data.artifact} />;
};

export type ArtifactsArticleProps = {
  role?: string;
  space: Space;
  attendableId?: string;
};

/**
 * Browse/create hub for all Artifacts in a space, bound to the virtual "Artifacts" navtree node. The
 * toolbar's Create button opens a menu to pick the kind (image/video); selecting one creates that
 * Artifact and opens it. Clicking a card opens that Artifact's ArtifactArticle.
 */
export const ArtifactsArticle = ({ role, space }: ArtifactsArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const artifacts = useQuery(space?.db, Filter.type(Artifact.Artifact));
  const items = useMemo<TileData[]>(() => artifacts.map((artifact) => ({ artifact })), [artifacts]);

  const open = useCallback(
    (object: Obj.Unknown) => invokePromise(LayoutOperation.Open, { subject: [Paths.getObjectPathFromObject(object)] }),
    [invokePromise],
  );

  const handleCreate = useCallback(
    async (kind: Kind) => {
      if (!space?.db) {
        return;
      }
      const artifact = space.db.add(Artifact.make({ kind }));
      await open(artifact);
    },
    [space, open],
  );

  const handleSelect = useCallback(
    (id: string, _event: MouseEvent) => {
      const artifact = artifacts.find((candidate) => candidate.id === id);
      if (artifact) {
        void open(artifact);
      }
    },
    [artifacts, open],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          {/* The Create button opens a menu to pick the kind; selecting one creates that Artifact. */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <IconButton icon='ph--plus--regular' label={t('create.label')} disabled={!space?.db} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align='start'>
                <DropdownMenu.Viewport>
                  <DropdownMenu.Item onClick={() => void handleCreate('image')}>
                    <Icon icon='ph--image--regular' size={4} />
                    <span className='grow'>{t('kind.image.label')}</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => void handleCreate('video')}>
                    <Icon icon='ph--video-camera--regular' size={4} />
                    <span className='grow'>{t('kind.video.label')}</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        {items.length === 0 ? (
          <div role='status' className='flex items-center justify-center bs-full text-subdued'>
            {t('empty.message')}
          </div>
        ) : (
          <Masonry.Root Tile={ArtifactTile}>
            <Masonry.Content centered>
              <Masonry.Viewport
                items={items}
                getId={(data?: TileData) => data?.artifact.id ?? ''}
                onSelect={handleSelect}
              />
            </Masonry.Content>
          </Masonry.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

ArtifactsArticle.displayName = 'ArtifactsArticle';
