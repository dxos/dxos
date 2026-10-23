//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { type GraphModel, type LatticeSpec } from '@dxos/react-ui-canvas/scene';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { LatticeGraph } from '../LatticeGraph/index.ts';
import {
  type DefinitionModel,
  type ReviewModel,
  type SpecTexts,
  STATUS_STYLE,
  type VerdictStatus,
  buildDefinitionGraph,
  kindStyle,
  reviewAnnotations,
  selectDefinitions,
  statusOf,
} from '../SpecModel/index.ts';

/** Acceptance blocks; they name most of the design, so they are hidden until asked for to keep the design legible. */
const ACCEPTANCE_KINDS = ['scenario', 'test', 'suite'];

/** Short cards: a definition shows its kind, id and title, and its dependencies are the arrows. */
const LATTICE: LatticeSpec = { width: 256, height: 128, gutterX: 64, gutterY: 64 };

type DefinitionCardProps = {
  definition: DefinitionModel;
  dependents: number;
  status?: VerdictStatus;
};

const DefinitionCard = ({ definition, dependents, status }: DefinitionCardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { icon, hue } = kindStyle(definition.kind);
  const { external } = definition;
  return (
    // An external node is outlined dashed, the convention the decision graph uses for what is not the person's own.
    <div
      className={mx('contents', external && '[&>*]:border-dashed [&>*]:border-2 [&>*]:border-accent-text')}
      title={external ? t('definition-graph.external.hint') : t('definition-graph.local.hint')}
    >
      <Card.Root
        data-testid='definition-graph.definition'
        data-definition={definition.id}
        data-kind={definition.kind}
        data-external={external?.target}
        data-status={status}
      >
        <Card.Header>
          <Layout.Block rail='start'>
            <Icon.Icon icon={icon} />
          </Layout.Block>
          <Card.Title truncate classNames='font-mono'>
            {external ? (external.fragment ?? definition.title) : definition.id}
          </Card.Title>
          {status && (
            <Layout.Block rail='end'>
              <Icon.Icon icon={STATUS_STYLE[status].icon} classNames={STATUS_TEXT[status]} />
            </Layout.Block>
          )}
        </Card.Header>
        <Card.Body>
          {external ? (
            <Card.Row>
              <Card.Text lines={1} classNames='font-mono text-xs text-description'>
                {external.key.path}
              </Card.Text>
            </Card.Row>
          ) : (
            definition.title && (
              <Card.Row>
                <Card.Text lines={1}>{definition.title}</Card.Text>
              </Card.Row>
            )
          )}
          <Card.Row>
            <Layout.Flex wrap gap='xs'>
              <Tag.Tag hue={hue}>{definition.kind}</Tag.Tag>
              {status && <Tag.Tag hue={STATUS_STYLE[status].hue}>{STATUS_STYLE[status].label}</Tag.Tag>}
              {definition.dependsOn.length > 0 && (
                <Tag.Tag>{t('definition-graph.uses.label', { count: definition.dependsOn.length })}</Tag.Tag>
              )}
              {dependents > 0 && <Tag.Tag>{t('definition-graph.used-by.label', { count: dependents })}</Tag.Tag>}
            </Layout.Flex>
          </Card.Row>
        </Card.Body>
      </Card.Root>
    </div>
  );
};

/** Status icon colours, matching the review gutter. */
const STATUS_TEXT: Record<VerdictStatus, string> = {
  done: 'text-success-text',
  untested: 'text-info-text',
  partial: 'text-warning-text',
  diverged: 'text-orange-text',
  missing: 'text-error-text',
};

type KindLegendProps = {
  kinds: string[];
  acceptance: boolean;
  onAcceptanceChange: (acceptance: boolean) => void;
  /** Absent when no annotation links the spec to code, so the switch is not offered. */
  code?: boolean;
  onCodeChange: (code: boolean) => void;
};

const KindLegend = ({ kinds, acceptance, onAcceptanceChange, code, onCodeChange }: KindLegendProps) => {
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
      {code !== undefined && (
        <Input.Switch
          checked={code}
          onCheckedChange={({ checked }) => onCodeChange(checked)}
          label={t('definition-graph.code.label')}
          data-testid='definition-graph.code'
        />
      )}
    </Layout.Flex>
  );
};

export type DefinitionGraphProps = {
  /** The text of a `.mdl` spec. */
  content: string;
  /** Other specs this one names by `github:` key, so their blocks can be described. */
  specs?: SpecTexts;
  /** The latest compliance review; its verdicts badge the cards and its evidence adds the code boxes. */
  review?: ReviewModel;
  /** Block kinds to leave out. */
  exclude?: string[];
  /** Whether scenarios, tests and suites start shown; a toggle in the legend changes it. */
  defaultAcceptance?: boolean;
  /** Double-click: an external node opens its spec or code; a local one is revealed in the spec. */
  onActivate?: (definition: DefinitionModel) => void;
};

/**
 * Every definition of a spec on a lattice, with an arrow from each to the definitions it names, so the
 * spec reads top-down from features to the types they rest on. Blocks of other specs the spec names by `github:` key,
 * and the code symbols the review links its items to, are drawn as dashed boxes.
 */
export const DefinitionGraph = ({
  content,
  specs,
  review,
  exclude = [],
  defaultAcceptance = false,
  onActivate,
}: DefinitionGraphProps) => {
  const [acceptance, setAcceptance] = useState(defaultAcceptance);
  const [code, setCode] = useState(true);
  const annotations = useMemo(() => reviewAnnotations(review), [review]);
  // A key rather than the array, so a caller passing a fresh literal each render does not re-lay out the graph.
  const excludeKey = [...exclude, ...(acceptance ? [] : ACCEPTANCE_KINDS), ...(code ? [] : ['code'])].join(',');
  const model = useMemo(
    () => selectDefinitions(buildDefinitionGraph(content, specs, annotations), excludeKey.split(',')),
    [content, specs, annotations, excludeKey],
  );
  const graph = useMemo<GraphModel>(
    () => ({
      nodes: model.definitions.map(({ id, title }) => ({ id, label: title ?? id })),
      edges: model.edges,
    }),
    [model],
  );
  const renderNode = useCallback(
    (id: string) => {
      const definition = model.byId.get(id);
      return (
        definition && (
          <DefinitionCard
            definition={definition}
            dependents={model.dependents.get(id) ?? 0}
            status={definition.external ? undefined : statusOf(review, id)}
          />
        )
      );
    },
    [model, review],
  );

  // The canvas captures the pointer, so a double-click never reaches the card; the card under the pointer is found here.
  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      const card = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-definition]');
      const definition = card && model.byId.get(card.getAttribute('data-definition') ?? '');
      definition && onActivate?.(definition);
    },
    [model, onActivate],
  );

  return (
    <div className='contents' onDoubleClick={handleDoubleClick}>
      <LatticeGraph graph={graph} renderNode={renderNode} lattice={LATTICE} arrange='force'>
        <KindLegend
          kinds={model.kinds}
          acceptance={acceptance}
          onAcceptanceChange={setAcceptance}
          code={annotations.length > 0 ? code : undefined}
          onCodeChange={setCode}
        />
      </LatticeGraph>
    </div>
  );
};
