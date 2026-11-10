//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type GraphEdge, type GraphModel, type LatticeSpec } from '@dxos/react-ui-canvas';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import { LatticeGraph } from '../LatticeGraph/index.ts';
import { type DataModelEdgeKind, type DataTypeModel, buildDataModel } from '../SpecModel/index.ts';

/** Tall cells, so a type's fields list below its name; a longer list scrolls inside the card. */
const LATTICE: LatticeSpec = { width: 256, height: 256, gutterX: 64, gutterY: 64 };

/** Line and marker per relation, UML-style: inheritance is a hollow triangle, a reference a dashed arrow. */
const EDGE_STYLE: Record<DataModelEdgeKind, Pick<GraphEdge, 'ends' | 'style'>> = {
  embeds: { ends: { start: 'circle', end: 'arrow' } },
  references: { ends: { end: 'arrow' }, style: { hue: 'sky', lineStyle: 'dashed' } },
  variant: { ends: { end: 'arrow' }, style: { hue: 'violet', lineStyle: 'dotted' } },
  extends: { ends: { end: 'triangle' }, style: { hue: 'neutral' } },
};

/** Field names size to the longest; types take the rest and truncate. */
const FIELD_COLUMNS = ['auto', 'fill'] as const;

const TypeCard = ({ type, types }: { type: DataTypeModel; types: ReadonlySet<string> }) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  return (
    <Card.Root
      classNames={type.stored ? 'border-2 border-blue-border' : 'border border-dashed border-separator'}
      data-testid='data-model.type'
      data-type={type.id}
      data-stored={type.stored}
    >
      <Card.Header>
        <Layout.Block rail='start'>
          <Icon.Icon
            icon={
              type.stored === 'table'
                ? 'ph--table--regular'
                : type.stored
                  ? 'ph--database--regular'
                  : 'ph--cube--regular'
            }
          />
        </Layout.Block>
        <Card.Title truncate classNames='font-mono'>
          {type.id}
        </Card.Title>
      </Card.Header>
      <Card.Body classNames='overflow-y-auto'>
        <Card.Row>
          <Layout.Flex wrap gap='xs'>
            {type.stored ? (
              <Tag.Tag hue='blue'>{t(`data-model.stored.${type.stored}.label`)}</Tag.Tag>
            ) : (
              <Tag.Tag>{t('data-model.embedded.label')}</Tag.Tag>
            )}
            {type.typename && <Tag.Tag classNames='font-mono'>{type.typename}</Tag.Tag>}
            {type.store && (
              <Tag.Tag classNames='font-mono max-w-full truncate' title={type.store}>
                {type.store}
              </Tag.Tag>
            )}
          </Layout.Flex>
        </Card.Row>
        {type.variants.length > 0 && (
          <Card.Row icon='ph--git-fork--regular'>
            <Card.Text lines={2} classNames='font-mono text-sm'>
              {type.variants.join(' | ')}
            </Card.Text>
          </Card.Row>
        )}
        {type.literals.length > 0 && (
          <Card.Row icon='ph--list-bullets--regular'>
            <Card.Text lines={2} classNames='font-mono text-sm'>
              {type.literals.join(' | ')}
            </Card.Text>
          </Card.Row>
        )}
        <Layout.Grid asChild cols={FIELD_COLUMNS} gap='sm' classNames='px-2 font-mono text-sm'>
          <dl data-testid='data-model.fields'>
            {type.fields.map((field) => (
              <div key={field.name} className='contents' title={field.comment}>
                <dt className='text-description truncate'>
                  {field.name}
                  {field.optional && '?'}
                </dt>
                <dd
                  className={mx(
                    'truncate',
                    field.refs.some((ref) => types.has(ref)) && (field.reference ? 'text-sky-text' : 'text-blue-text'),
                  )}
                >
                  {field.type}
                </dd>
              </div>
            ))}
          </dl>
        </Layout.Grid>
      </Card.Body>
    </Card.Root>
  );
};

const Legend = () => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  return (
    <Layout.Flex
      wrap
      gap='xs'
      classNames='absolute top-2 start-2 z-10 p-2 rounded-sm bg-base-surface border border-separator'
      data-testid='data-model.legend'
    >
      <Tag.Tag hue='blue'>
        <Icon.Icon icon='ph--database--regular' size='xs' />
        {t('data-model.legend.stored.label')}
      </Tag.Tag>
      <Tag.Tag>
        <Icon.Icon icon='ph--cube--regular' size='xs' />
        {t('data-model.embedded.label')}
      </Tag.Tag>
      <Tag.Tag>{t('data-model.edge.embeds.label')}</Tag.Tag>
      <Tag.Tag hue='sky'>{t('data-model.edge.references.label')}</Tag.Tag>
      <Tag.Tag hue='violet'>{t('data-model.edge.variant.label')}</Tag.Tag>
      <Tag.Tag hue='neutral'>{t('data-model.edge.extends.label')}</Tag.Tag>
    </Layout.Flex>
  );
};

export type DataModelGraphProps = {
  /** The text of a `.mdl` spec. */
  content: string;
};

/**
 * The persisted data model of a spec as an entity diagram: stored types (framed solid) and the value types
 * they embed (framed dashed), one card each listing its fields, with an arrow per field that holds another
 * spec type, per union variant and per base type.
 */
export const DataModelGraph = ({ content }: DataModelGraphProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const model = useMemo(() => buildDataModel(content), [content]);
  const byId = useMemo(() => new Map(model.types.map((type) => [type.id, type])), [model]);
  const ids = useMemo(() => new Set(byId.keys()), [byId]);
  const graph = useMemo<GraphModel>(
    () => ({
      nodes: model.types.map(({ id }) => ({ id, label: id })),
      edges: model.edges.map(({ id, kind, from, to, field }) => ({
        id,
        from,
        to,
        ...EDGE_STYLE[kind],
        ...(field && { text: field }),
      })),
    }),
    [model],
  );
  const renderNode = useCallback(
    (id: string) => {
      const type = byId.get(id);
      return type && <TypeCard type={type} types={ids} />;
    },
    [byId, ids],
  );

  if (model.types.length === 0) {
    return (
      <Status.Empty classNames='dx-fill' data-testid='data-model.empty'>
        {t('data-model.empty.message')}
      </Status.Empty>
    );
  }

  return (
    <LatticeGraph graph={graph} renderNode={renderNode} lattice={LATTICE}>
      <Legend />
    </LatticeGraph>
  );
};
