//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
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

/** The index states some facts in more than one graph (a file's own and a derived one); show each once. */
const unique = (facts: readonly Fact[] = []): Fact[] => {
  const seen = new Set<string>();
  return facts.filter(({ predicate, object }) => {
    const key = `${predicate} ${object}`;
    return !seen.has(key) && !!seen.add(key);
  });
};

/**
 * One resource's facts from the index, with the moves the canvas offers on it. The host floats it over the canvas,
 * so it is absolutely positioned against the host's frame.
 */
export const NodeDetails = ({ node, facts, incoming, error, onExpand, onRemove, onClose }: NodeDetailsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <Card.Root classNames='absolute top-2 right-2 bottom-2 w-80 flex flex-col' data-testid='code-graph-details'>
      <Card.Header>
        <Layout.Block rail='start'>
          <Icon.Icon icon={KIND_ICONS[node.kind]} />
        </Layout.Block>
        <Card.Title truncate title={node.id}>
          {node.label}
        </Card.Title>
        <Button.Root
          icon='ph--x--regular'
          iconOnly
          variant='ghost'
          label={t('close-details.label')}
          onClick={onClose}
        />
      </Card.Header>
      <Toolbar.Root>
        <Button.Root
          icon='ph--arrow-down-right--regular'
          iconOnly
          label={t('expand-out.label')}
          onClick={() => onExpand?.('out')}
        />
        <Button.Root
          icon='ph--arrow-up-left--regular'
          iconOnly
          label={t('expand-in.label')}
          onClick={() => onExpand?.('in')}
        />
        <Button.Root icon='ph--trash--regular' iconOnly label={t('remove-node.label')} onClick={onRemove} />
      </Toolbar.Root>
      <ScrollArea.Root classNames='grow'>
        <ScrollArea.Viewport>
          <Layout.Grid asChild cols={['max', 'fill']} gap='sm' classNames='p-2 text-sm'>
            <dl>
              {error && <dd className='col-span-2 text-error-text'>{error}</dd>}
              {unique(facts)
                .slice(0, FACTS)
                .map(({ predicate, object }, index) => (
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
          </Layout.Grid>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Card.Root>
  );
};
