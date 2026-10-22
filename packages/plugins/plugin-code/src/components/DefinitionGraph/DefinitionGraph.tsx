//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type GraphModel, type LatticeSpec } from '@dxos/react-ui-canvas/scene';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import { LatticeGraph } from '../LatticeGraph/index.ts';
import { type DefinitionModel, buildDefinitionGraph, kindStyle } from '../SpecModel/index.ts';

/** Acceptance blocks; they name most of the design, so they are hidden until asked for to keep the design legible. */
const ACCEPTANCE_KINDS = ['scenario', 'test', 'suite'];

/** Short cards: a definition shows its kind, id and title, and its dependencies are the arrows. */
const LATTICE: LatticeSpec = { width: 256, height: 128, gutterX: 64, gutterY: 64 };

const DefinitionCard = ({ definition, dependents }: { definition: DefinitionModel; dependents: number }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { icon, hue } = kindStyle(definition.kind);
  return (
    <Card.Root data-testid='definition-graph.definition' data-definition={definition.id} data-kind={definition.kind}>
      <Card.Header>
        <Layout.Block rail='start'>
          <Icon.Icon icon={icon} />
        </Layout.Block>
        <Card.Title truncate classNames='font-mono'>
          {definition.id}
        </Card.Title>
      </Card.Header>
      <Card.Body>
        {definition.title && (
          <Card.Row>
            <Card.Text lines={1}>{definition.title}</Card.Text>
          </Card.Row>
        )}
        <Card.Row>
          <Layout.Flex wrap gap='xs'>
            <Tag.Tag hue={hue}>{definition.kind}</Tag.Tag>
            {definition.dependsOn.length > 0 && (
              <Tag.Tag>{t('definition-graph.uses.label', { count: definition.dependsOn.length })}</Tag.Tag>
            )}
            {dependents > 0 && <Tag.Tag>{t('definition-graph.used-by.label', { count: dependents })}</Tag.Tag>}
          </Layout.Flex>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};

type KindLegendProps = { kinds: string[]; acceptance: boolean; onAcceptanceChange: (acceptance: boolean) => void };

const KindLegend = ({ kinds, acceptance, onAcceptanceChange }: KindLegendProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Layout.Flex
      wrap
      gap='xs'
      classNames='absolute top-2 start-2 z-10 p-2 items-center rounded-sm bg-base-surface border border-separator'
      data-testid='definition-graph.legend'
    >
      {kinds.map((kind) => (
        <Tag.Tag key={kind} hue={kindStyle(kind).hue}>
          <Icon.Icon icon={kindStyle(kind).icon} size='xs' />
          {kind}
        </Tag.Tag>
      ))}
      <Input.Switch
        checked={acceptance}
        onCheckedChange={({ checked }) => onAcceptanceChange(checked)}
        label={t('definition-graph.acceptance.label')}
        data-testid='definition-graph.acceptance'
      />
    </Layout.Flex>
  );
};

export type DefinitionGraphProps = {
  /** The text of a `.mdl` spec. */
  content: string;
  /** Block kinds to leave out. */
  exclude?: string[];
  /** Whether scenarios, tests and suites start shown; a toggle in the legend changes it. */
  defaultAcceptance?: boolean;
};

/**
 * Every definition of a spec on a lattice, with an arrow from each to the definitions it names, so the
 * spec reads top-down from features to the types they rest on.
 */
export const DefinitionGraph = ({ content, exclude = [], defaultAcceptance = false }: DefinitionGraphProps) => {
  const [acceptance, setAcceptance] = useState(defaultAcceptance);
  // A key rather than the array, so a caller passing a fresh literal each render does not re-lay out the graph.
  const excludeKey = [...exclude, ...(acceptance ? [] : ACCEPTANCE_KINDS)].join(',');
  const model = useMemo(() => {
    const { definitions, edges } = buildDefinitionGraph(content);
    const excluded = new Set(excludeKey.split(','));
    const kept = definitions.filter(({ kind }) => !excluded.has(kind));
    const ids = new Set(kept.map(({ id }) => id));
    return { definitions: kept, edges: edges.filter(({ from, to }) => ids.has(from) && ids.has(to)) };
  }, [content, excludeKey]);
  const byId = useMemo(() => new Map(model.definitions.map((definition) => [definition.id, definition])), [model]);
  const dependents = useMemo(() => {
    const counts = new Map<string, number>();
    model.edges.forEach(({ to }) => counts.set(to, (counts.get(to) ?? 0) + 1));
    return counts;
  }, [model]);
  const graph = useMemo<GraphModel>(
    () => ({
      nodes: model.definitions.map(({ id, title }) => ({ id, label: title ?? id })),
      edges: model.edges,
    }),
    [model],
  );
  const kinds = useMemo(() => [...new Set(model.definitions.map(({ kind }) => kind))], [model]);
  const renderNode = useCallback(
    (id: string) => {
      const definition = byId.get(id);
      return definition && <DefinitionCard definition={definition} dependents={dependents.get(id) ?? 0} />;
    },
    [byId, dependents],
  );

  return (
    <LatticeGraph graph={graph} renderNode={renderNode} lattice={LATTICE} arrange='force'>
      <KindLegend kinds={kinds} acceptance={acceptance} onAcceptanceChange={setAcceptance} />
    </LatticeGraph>
  );
};
