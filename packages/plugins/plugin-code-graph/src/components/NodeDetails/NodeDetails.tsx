//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { Iri, Kind } from '#graph';
import { meta } from '#meta';
import { type CodeGraph } from '#types';

import { KIND_ICONS } from '../icons.ts';

export type Fact = { predicate: string; object: string };

export type NodeDetailsProps = {
  /** Size and placement, which the host decides. */
  classNames?: string;
  node: CodeGraph.Node;
  /** What the resource is, e.g. `capability` or `file`; the node's coarse kind when absent. */
  kind?: string;
  facts?: readonly Fact[];
  incoming?: readonly { predicate: string; count: number }[];
  error?: string;
  onExpand?: (direction: 'out' | 'in') => void;
  onRemove?: () => void;
  /** Without it there is no close button, as in a hover card that closes by itself. */
  onClose?: () => void;
};

/** Facts shown: enough to say what the resource is without turning the panel into a dump. */
const FACTS = 16;

/** The definition, shown highlighted above the facts rather than as one of them. */
const SNIPPET = 'snippet';

/** The index states some facts in more than one graph (a file's own and a derived one); show each once. */
const unique = (facts: readonly Fact[] = []): Fact[] => {
  const seen = new Set<string>();
  return facts.filter(({ predicate, object }) => {
    const key = `${predicate} ${object}`;
    return !seen.has(key) && !!seen.add(key);
  });
};

/** Facts grouped under their predicate's name, in the order the index gave them. */
const byPredicate = (facts: readonly Fact[]): [string, string[]][] => {
  const groups = new Map<string, string[]>();
  for (const { predicate, object } of facts) {
    const name = Iri.localName(predicate);
    groups.set(name, [...(groups.get(name) ?? []), object]);
  }
  return [...groups];
};

/** Prism names a `.tsx` file's grammar apart from a `.ts` file's. */
const languageOf = (iri: string): string => (Iri.pathOf(iri)?.endsWith('.tsx') ? 'tsx' : 'typescript');

/**
 * One resource's facts from the index, with its definition on top and the moves the canvas offers on it. The host
 * sizes and places it: floated over the canvas, or inside a hover card.
 */
export const NodeDetails = ({
  classNames,
  node,
  kind,
  facts,
  incoming,
  error,
  onExpand,
  onRemove,
  onClose,
}: NodeDetailsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const shown = unique(facts);
  const snippet = shown.find(({ predicate }) => Iri.localName(predicate) === SNIPPET)?.object;
  const groups = byPredicate(shown.filter(({ predicate }) => Iri.localName(predicate) !== SNIPPET).slice(0, FACTS));
  return (
    <Card.Root grid classNames={['overflow-y-auto', classNames]} data-testid='code-graph-details'>
      <Card.Header>
        <Layout.Block rail='start'>
          <Icon.Icon icon={KIND_ICONS[node.kind]} />
        </Layout.Block>
        <Card.Title truncate title={node.id}>
          {Kind.titleOf(node)}
        </Card.Title>
        {onClose && (
          <Button.Root
            icon='ph--x--regular'
            iconOnly
            variant='ghost'
            label={t('close-details.label')}
            onClick={onClose}
          />
        )}
      </Card.Header>
      <Card.Body>
        <Layout.Flex>
          <Tag.Tag hue={Kind.hueOf(kind ?? node.kind)}>{kind ?? node.kind}</Tag.Tag>
        </Layout.Flex>
      </Card.Body>
      {snippet && (
        <Card.Row span='end' data-testid='code-graph-snippet'>
          <SyntaxHighlighter
            language={languageOf(node.id)}
            classNames='max-h-60 py-1 text-xs rounded-sm bg-group-surface'
          >
            {snippet}
          </SyntaxHighlighter>
        </Card.Row>
      )}
      {error && (
        <Card.Row icon='ph--warning--regular' classNames='text-error-text'>
          {error}
        </Card.Row>
      )}
      {groups.map(([predicate, objects]) => (
        <Card.Section key={predicate} title={predicate}>
          {objects.map((object, index) => (
            <Card.Row key={index} title={object}>
              <span className='truncate'>{Iri.isIri(object) ? Iri.labelOf(object) : object}</span>
            </Card.Row>
          ))}
        </Card.Section>
      ))}
      {incoming && incoming.length > 0 && (
        <Card.Section title={t('incoming.label')}>
          {incoming.map(({ predicate, count }) => (
            <Card.Row key={predicate} trailing={count}>
              {Iri.localName(predicate)}
            </Card.Row>
          ))}
        </Card.Section>
      )}
      <Card.Footer justify='start'>
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
      </Card.Footer>
    </Card.Root>
  );
};
