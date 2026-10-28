//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import { Tag } from '@dxos/react-ui/Tag';
import * as Typography from '@dxos/react-ui/Typography';

import { meta } from '#meta';

import { type GraphNode } from '../../client/types.ts';
import { toCard } from '../../model/results.ts';
import { iconOf, kindOfNode, nodeEntity } from './model.ts';

/** Facts a graph card shows beyond the result card's rows, for the kinds a graph is mostly made of. */
const EXTRA: Array<{ key: string; icon: string; format?: (value: unknown) => string }> = [
  { key: 'schema:roleName', icon: 'ph--identification-badge--regular' },
  { key: 'schema:jobTitle', icon: 'ph--briefcase--regular' },
  { key: 'lh:worksCount', icon: 'ph--files--regular', format: (value) => `${value} works` },
  { key: 'lh:citationCount', icon: 'ph--quotes--regular', format: (value) => `cited ${value}×` },
  { key: 'schema:datePublished', icon: 'ph--calendar--regular', format: (value) => String(value).slice(0, 10) },
  { key: 'schema:startDate', icon: 'ph--calendar--regular', format: (value) => String(value).slice(0, 10) },
];

export type GraphNodeCardProps = {
  node: GraphNode;
  root?: boolean;
  selected?: boolean;
  /** Neighbours the walk left out; offered as "+N more". */
  more?: number;
  onMore?: () => void;
};

/**
 * One node as a small card, as lighthouse's graph shows it: a photo or a type icon, the title, its kind, and one or
 * two key facts (four on a root). Its size is fixed, so the layout can place it before it renders.
 */
/** Types whose picture is a logo rather than a photo. */
const isLogo = (types: readonly string[]) => /Organization|VentureFund|Corporation/.test(types.join(' '));

export const GraphNodeCard = ({ node, root = false, selected = false, more, onMore }: GraphNodeCardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const card = toCard(nodeEntity(node));
  const seen = new Set<string>();
  const facts = [
    ...EXTRA.flatMap((extra) => {
      const value = node.props[extra.key]?.[0];
      return value === undefined
        ? []
        : [{ icon: extra.icon, text: extra.format ? extra.format(value) : String(value) }];
    }),
    ...card.rows.map((row) => ({ icon: row.icon, text: row.text })),
  ]
    .filter((fact) => !seen.has(fact.icon) && !!seen.add(fact.icon))
    .slice(0, root ? 4 : 1);
  const image = node.image ?? card.images[0];

  const handleMore = (event: MouseEvent) => {
    event.stopPropagation();
    onMore?.();
  };

  return (
    <Card.Root
      classNames={[
        'h-full overflow-hidden shadow-sm bg-card-surface',
        selected && 'dx-current',
        root ? 'outline-2 outline-accent-text' : selected && 'outline-2 outline-accent-text/60',
      ]}
      data-testid='lighthouse.graph.node'
      data-iri={node.id}
      data-root={root || undefined}
    >
      <Card.Header>
        {image ? (
          <img
            src={image}
            alt=''
            loading='lazy'
            // An SVG logo without its own width and height scales into this box rather than collapsing.
            width={root ? 48 : 32}
            height={root ? 48 : 32}
            // An organisation's picture is its logo, often dark on transparent: shown whole, on a light ground in
            // either theme, as lighthouse's web UI does.
            className={[
              root ? 'size-12' : 'size-8',
              'shrink-0 rounded-sm',
              isLogo(node.types) ? 'object-contain object-center bg-white p-0.5' : 'object-cover',
            ].join(' ')}
          />
        ) : (
          <Layout.Flex
            center
            classNames={[root ? 'size-12' : 'size-8', 'shrink-0 rounded-sm bg-group-surface text-fg-subtle']}
          >
            <Icon.Icon icon={iconOf(node.types)} size={root ? 'lg' : 'md'} />
          </Layout.Flex>
        )}
        <Layout.Flex column gap='xs' classNames='min-w-0'>
          <Card.Title lines={2} classNames={root ? 'text-base font-semibold' : 'text-sm'}>
            {card.title}
          </Card.Title>
          <Layout.Flex gap='xs' align='center' wrap>
            <Tag hue='neutral'>{kindOfNode(node)}</Tag>
            {more ? (
              <Button.Root
                variant='ghost'
                size='sm'
                classNames='h-5 px-1 text-xs'
                onClick={handleMore}
                data-testid='lighthouse.graph.more'
              >
                {t('graph-more.label', { count: more })}
              </Button.Root>
            ) : null}
          </Layout.Flex>
        </Layout.Flex>
      </Card.Header>
      {facts.map((fact) => (
        <Card.Row key={fact.icon} icon={fact.icon}>
          <Typography.Text truncate classNames='text-xs'>
            {fact.text}
          </Typography.Text>
        </Card.Row>
      ))}
    </Card.Root>
  );
};
