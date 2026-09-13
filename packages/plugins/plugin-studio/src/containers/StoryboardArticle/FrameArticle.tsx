//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Accordion, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { DropIndicator, type ReorderListController, useReorderItem } from '@dxos/react-ui-list';
import { Empty } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { type Frame } from '#types';

export type FrameArticleProps = {
  frame: Frame.Frame;
  index: number;
  /** The storyboard plank's id; the nested article is attended through it. */
  attendableId?: string;
  /** Reorder controller of the enclosing storyboard; the header's handle drags the frame. */
  reorder: ReorderListController<Frame.Frame>;
  onDelete?: (frame: Frame.Frame) => void;
};

/**
 * One frame of a storyboard: an accordion item whose header names the frame and whose body shows the
 * frame's artifact through the article surface — the same `MediaArtifactArticle` the artifact has on
 * its own, given a fixed height because an article panel expands to fill and an accordion body has
 * nothing to fill. The artifact's toolbar reads its contributed actions (Connect) from the
 * artifact's node under the storyboard, while attention follows the storyboard plank.
 */
export const FrameArticle = ({ frame, index, attendableId, reorder, onDelete }: FrameArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [artifact] = useObject(frame.artifact);
  const [snapshot] = useObject(frame);
  const { rowRef, handleRef, closestEdge, isDragging } = useReorderItem(reorder, frame.id);

  return (
    <Accordion.Item ref={rowRef} item={frame} classNames={isDragging ? 'opacity-50' : undefined}>
      <div className='relative'>
        <Accordion.ItemHeader
          leading={
            <span
              ref={handleRef}
              className='flex items-center cursor-grab text-subdued'
              aria-label={t('drag-frame.label')}
            >
              <Icon icon='ph--dots-six-vertical--regular' size={4} />
            </span>
          }
          trailing={
            onDelete && (
              <IconButton
                iconOnly
                variant='ghost'
                icon='ph--trash--regular'
                label={t('delete-frame.label')}
                onClick={() => onDelete(frame)}
              />
            )
          }
        >
          <span className='text-subdued me-2'>{index + 1}</span>
          {snapshot?.name || artifact?.name || t('frame.placeholder')}
        </Accordion.ItemHeader>
        {closestEdge && <DropIndicator edge={closestEdge} />}
      </div>
      <Accordion.ItemBody classNames='p-0'>
        {/* A bounded height so the nested article panel has something to fill; also a slide's shape. */}
        <div className='grid h-[32rem] overflow-hidden'>
          {artifact ? (
            <Surface.Surface
              type={AppSurface.Article}
              data={{
                subject: artifact,
                attendableId,
                nodeId: attendableId ? `${attendableId}/${artifact.id}` : undefined,
              }}
              limit={1}
            />
          ) : (
            <Empty label={t('frame-empty.message')} />
          )}
        </div>
      </Accordion.ItemBody>
    </Accordion.Item>
  );
};

FrameArticle.displayName = 'FrameArticle';
