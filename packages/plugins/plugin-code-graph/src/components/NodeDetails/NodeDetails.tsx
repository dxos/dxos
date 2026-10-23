//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Iri } from '#graph';
import { meta } from '#meta';
import { type CodeGraph } from '#types';

import { KIND_ICONS } from '../icons.ts';

export type Fact = { predicate: string; object: string };

export type NodeDetailsProps = {
  node: CodeGraph.Node;
  facts?: readonly Fact[];
  incoming?: readonly { predicate: string; count: number }[];
  error?: string;
  onExpand?: (direction: 'out' | 'in') => void;
  onRemove?: () => void;
  onClose?: () => void;
};

/** Facts shown: enough to say what the resource is without turning the panel into a dump. */
const FACTS = 16;

/** One resource's facts from the index, with the moves the canvas offers on it. */
export const NodeDetails = ({ node, facts, incoming, error, onExpand, onRemove, onClose }: NodeDetailsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <div
      className='absolute top-2 right-2 bottom-2 w-80 flex flex-col rounded-md border border-separator bg-base-surface'
      data-testid='code-graph-details'
    >
      <div className='flex items-center gap-2 p-2 border-b border-separator min-w-0'>
        <Icon.Icon icon={KIND_ICONS[node.kind]} size='md' />
        <span className='grow truncate font-medium' title={node.id}>
          {node.label}
        </span>
        <Button.Root
          icon='ph--x--regular'
          iconOnly
          variant='ghost'
          label={t('close-details.label')}
          onClick={onClose}
        />
      </div>
      <Toolbar.Root classNames='px-1'>
        <Button.Root
          icon='ph--arrow-down-right--regular'
          label={t('expand-out.label')}
          onClick={() => onExpand?.('out')}
        />
        <Button.Root icon='ph--arrow-up-left--regular' label={t('expand-in.label')} onClick={() => onExpand?.('in')} />
        <Button.Root icon='ph--trash--regular' iconOnly label={t('remove-node.label')} onClick={onRemove} />
      </Toolbar.Root>
      <ScrollArea.Root classNames='grow'>
        <ScrollArea.Viewport>
          <dl className='grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 p-2 text-sm'>
            {error && <dd className='col-span-2 text-error-text'>{error}</dd>}
            {facts?.slice(0, FACTS).map(({ predicate, object }, index) => (
              <React.Fragment key={index}>
                <dt className='text-description'>{Iri.localName(predicate)}</dt>
                <dd className='truncate' title={object}>
                  {Iri.isIri(object) ? Iri.labelOf(object) : object}
                </dd>
              </React.Fragment>
            ))}
            {incoming?.map(({ predicate, count }) => (
              <React.Fragment key={predicate}>
                <dt className='text-description'>← {Iri.localName(predicate)}</dt>
                <dd>{count}</dd>
              </React.Fragment>
            ))}
          </dl>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};
