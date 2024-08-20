//
// Copyright 2024 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import {
  LayoutAction,
  type LayoutCoordinate,
  type LayoutEntry,
  type LayoutPart,
  type LayoutParts,
  NavigationAction,
  Surface,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { Button, Tooltip, useTranslation, type ClassNameValue } from '@dxos/react-ui';
import { createAttendableAttributes } from '@dxos/react-ui-attention';
import { Plank as NaturalPlank } from '@dxos/react-ui-deck';

import { NodePlankHeading } from './NodePlankHeading';
import { PlankContentError, PlankError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { NAV_ID } from './constants';
import { useNode } from '../../hooks';
import { DECK_PLUGIN } from '../../meta';
import { useLayout } from '../LayoutContext';

export type PlankProps = {
  entry: LayoutEntry;
  layoutParts: LayoutParts;
  // TODO(wittjosiah): Remove.
  part: LayoutPart;
  boundary?: 'start' | 'end';
  resizeable?: boolean;
  flatDeck?: boolean;
  searchEnabled?: boolean;
  classNames?: ClassNameValue;
};

export const Plank = ({
  entry,
  layoutParts,
  part,
  boundary,
  resizeable,
  flatDeck,
  searchEnabled,
  classNames,
}: PlankProps) => {
  const { t } = useTranslation(DECK_PLUGIN);
  const dispatch = useIntentDispatcher();
  const { popoverAnchorId, scrollIntoView } = useLayout();
  const { graph } = useGraph();
  const node = useNode(graph, entry.id);

  const attendableAttrs = createAttendableAttributes(entry.id);

  // TODO(Zan): Switch this to the new layout coordinates once consumers can speak that.
  const coordinate: LayoutCoordinate = {
    part,
    entryId: entry.id,
  };

  return (
    <NaturalPlank.Root boundary={boundary}>
      <NaturalPlank.Content
        {...attendableAttrs}
        classNames={[!flatDeck && 'surface-base', classNames]}
        scrollIntoViewOnMount={entry.id === scrollIntoView}
        suppressAutofocus={entry.id === NAV_ID || !!node?.properties?.managesAutofocus}
      >
        {node ? (
          <>
            <NodePlankHeading
              layoutPart={coordinate.part}
              layoutParts={layoutParts}
              node={node}
              id={entry.id}
              popoverAnchorId={popoverAnchorId}
              flatDeck={flatDeck}
            />
            <Surface
              role='article'
              data={{
                ...(entry.path ? { subject: node.data, path: entry.path } : { object: node.data }),
                coordinate,
                popoverAnchorId,
              }}
              limit={1}
              fallback={PlankContentError}
              placeholder={<PlankLoading />}
            />
          </>
        ) : (
          <PlankError layoutCoordinate={coordinate} id={entry.id} flatDeck={flatDeck} />
        )}
      </NaturalPlank.Content>
      {searchEnabled && resizeable ? (
        <div role='none' className='grid grid-rows-subgrid row-span-3'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button
                data-testid='plankHeading.open'
                variant='ghost'
                classNames='p-1 w-fit'
                onClick={() =>
                  dispatch([
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: 'dxos.org/plugin/search/Dialog',
                        dialogBlockAlign: 'start',
                        subject: {
                          action: NavigationAction.SET,
                          position: 'add-after',
                          coordinate,
                        },
                      },
                    },
                  ])
                }
              >
                <span className='sr-only'>{t('insert plank label')}</span>
                <Plus />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content side='bottom' classNames='z-[70]'>
                {t('insert plank label')}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <NaturalPlank.ResizeHandle classNames='row-start-[toolbar-start] row-end-[content-end]' />
        </div>
      ) : resizeable ? (
        <NaturalPlank.ResizeHandle classNames='row-span-3' />
      ) : null}
    </NaturalPlank.Root>
  );
};
