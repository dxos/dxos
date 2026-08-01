//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Atom from '@effect-atom/atom/Atom';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Board, type BoardController, type BoardRootProps, type Layout, resizeToFit } from '@dxos/react-ui-board';

import { ArtifactCard } from '#components';
import { meta } from '#meta';
import { Artifact, type Lightbox } from '#types';

const isArtifact = Obj.instanceOf(Artifact.Artifact);

export type LightboxArticleProps = AppSurface.ObjectArticleProps<Lightbox.Lightbox>;

/**
 * A spatial "lightbox" of {@link Artifact}s laid out on a `Board` (react-ui-board). Each artifact
 * renders as its cover-variant card (the `CardContent` surface); dragging persists cell positions.
 * The same artifacts can also be viewed as a `Collection` masonry — layout is a view, not a schema.
 */
export const LightboxArticle = ({ role, subject: lightbox, attendableId }: LightboxArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);

  const [items] = useObject(lightbox, 'items');
  const itemsAtom = useMemo(
    () =>
      Atom.make((get) => {
        const result: Artifact.Artifact[] = [];
        for (const ref of items ?? []) {
          const obj = get(Obj.atomReactive(ref));
          if (obj && isArtifact(obj)) {
            result.push(obj);
          }
        }
        return result;
      }),
    [items],
  );
  const artifacts = useAtomValue(itemsAtom);

  const controller = useRef<BoardController>(null);
  const [zoom, setZoom] = useState(1);

  const layout = useMemo<Layout>(() => ({ items: lightbox.layout.cells }), [lightbox.layout.cells]);
  const bounds = useMemo(
    () => ({ columns: lightbox.layout.size.width, rows: lightbox.layout.size.height }),
    [lightbox.layout.size.width, lightbox.layout.size.height],
  );

  const handleChange = useCallback<NonNullable<BoardRootProps['onChange']>>(
    (next) => {
      Obj.update(lightbox, (lightbox) => {
        lightbox.layout.cells = next.items;
      });
    },
    [lightbox],
  );

  return (
    <Board.Root
      ref={controller}
      layout={layout}
      bounds={bounds}
      mode='float'
      resolver={resizeToFit}
      zoom={zoom}
      onChange={handleChange}
    >
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.IconButton
              icon='ph--crosshair--regular'
              iconOnly
              label={t('center.label')}
              disabled={!hasAttention}
              onClick={() => controller.current?.center()}
            />
            <Toolbar.IconButton
              icon={zoom < 1 ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
              iconOnly
              label={t('zoom.label')}
              disabled={!hasAttention}
              onClick={() => setZoom((value) => (value < 1 ? 1 : 0.5))}
            />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Board.Container classNames='absolute inset-0'>
            <Board.Viewport>
              <Board.Backdrop />
              <Board.Content>
                {artifacts.map((artifact) => {
                  const itemLayout = layout.items[artifact.id];
                  return itemLayout ? (
                    <Board.Cell item={artifact} key={artifact.id} layout={itemLayout}>
                      <ArtifactCard subject={artifact} />
                    </Board.Cell>
                  ) : null;
                })}
              </Board.Content>
            </Board.Viewport>
          </Board.Container>
        </Panel.Content>
      </Panel.Root>
    </Board.Root>
  );
};

LightboxArticle.displayName = 'LightboxArticle';
