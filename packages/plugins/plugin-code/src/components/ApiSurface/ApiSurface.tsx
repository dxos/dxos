//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useMemo } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import { type ApiGroupModel, type EndpointModel, buildApiModel, kindStyle } from '../SpecModel/index.ts';

const TYPE_TOKEN = /([A-Za-z][\w.]*)/g;

/** A type expression with the spec's own types marked, so a signature shows what it takes from the data model. */
const TypeExpr = ({ expr, types }: { expr: string; types: ReadonlySet<string> }) => (
  <>
    {expr.split(TYPE_TOKEN).map((part, index) =>
      types.has(part) ? (
        <span key={index} className='text-blue-text' data-testid='api-surface.spec-type'>
          {part}
        </span>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      ),
    )}
  </>
);

const Signature = ({ endpoint, types }: { endpoint: EndpointModel; types: ReadonlySet<string> }) => (
  <code className='font-mono text-sm whitespace-normal break-words'>
    <span className={mx('font-medium', endpoint.event && 'italic')}>{endpoint.name}</span>
    <span className='text-description'>(</span>
    {endpoint.inputs.map((input, index) => (
      <Fragment key={input.name}>
        {index > 0 && <span className='text-description'>, </span>}
        <span title={input.comment}>
          {input.name}
          {input.optional && '?'}
          <span className='text-description'>: </span>
          <TypeExpr expr={input.type} types={types} />
        </span>
      </Fragment>
    ))}
    <span className='text-description'>)</span>
    {endpoint.output && (
      <>
        <span className='text-description'> {'->'} </span>
        <TypeExpr expr={endpoint.output} types={types} />
      </>
    )}
  </code>
);

type GroupRowsProps = { group: ApiGroupModel; effects: string[]; types: ReadonlySet<string> };

/** An op is one row; a service is a heading row then one row per method or event, all sharing its effects. */
const GroupRows = ({ group, effects, types }: GroupRowsProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { icon } = kindStyle(group.kind);
  const effectCells = (dim: boolean) =>
    effects.map((effect) => (
      <Layout.Flex key={effect} role='cell' justify='center' align='start' classNames='pt-1'>
        {group.effects.includes(effect) && (
          <span
            className={mx('block size-2.5 rounded-full bg-orange-text', dim && 'opacity-40')}
            title={effect}
            data-testid='api-surface.effect'
          />
        )}
      </Layout.Flex>
    ));
  const trailing = (
    <Layout.Flex role='cell' wrap gap='xs' align='start'>
      {group.requires.map((capability) => (
        <Tag.Tag
          key={capability}
          hue='indigo'
          classNames='font-mono max-w-full truncate'
          title={`${t('api-surface.requires.label')}: ${capability}`}
        >
          {capability}
        </Tag.Tag>
      ))}
      {group.errors.map((error) => (
        <Tag.Tag key={error.name} hue='error' classNames='max-w-full truncate' title={error.desc ?? error.name}>
          {error.name}
        </Tag.Tag>
      ))}
    </Layout.Flex>
  );

  if (group.kind === 'op') {
    const [endpoint] = group.endpoints;
    return (
      <div role='row' className='contents' data-testid='api-surface.op' data-op={group.id}>
        <Layout.Flex role='cell' gap='sm' align='start' classNames='min-w-0'>
          <Icon.Icon icon={icon} classNames='text-orange-text mt-0.5 shrink-0' />
          <Layout.Flex column classNames='min-w-0'>
            <Signature endpoint={endpoint} types={types} />
            {endpoint.key && <span className='text-xs text-description font-mono truncate'>{endpoint.key}</span>}
          </Layout.Flex>
        </Layout.Flex>
        {effectCells(false)}
        {trailing}
      </div>
    );
  }

  return (
    <>
      <div role='row' className='contents' data-testid='api-surface.service' data-service={group.id}>
        <Layout.Flex role='cell' gap='sm' align='center' classNames='min-w-0 pt-2'>
          <Icon.Icon icon={icon} classNames='text-yellow-text shrink-0' />
          <span className='font-medium truncate'>{group.id}</span>
        </Layout.Flex>
        {effectCells(false)}
        {trailing}
      </div>
      {group.endpoints.map((endpoint) => (
        <div key={endpoint.id} role='row' className='contents' data-testid='api-surface.method'>
          <Layout.Flex role='cell' gap='sm' align='start' classNames='min-w-0 ps-6'>
            <Icon.Icon
              icon={endpoint.event ? 'ph--broadcast--regular' : 'ph--arrow-right--regular'}
              size='sm'
              classNames='text-description mt-0.5 shrink-0'
            />
            <Signature endpoint={endpoint} types={types} />
          </Layout.Flex>
          {effectCells(true)}
          <div role='cell' />
        </div>
      ))}
    </>
  );
};

export type ApiSurfaceProps = {
  /** The text of a `.mdl` spec. */
  content: string;
};

/**
 * The callable surface of a spec as a signature sheet: each operation, then each service with its methods
 * and events, with the spec's own types marked in the signatures, a column per declared effect, and the
 * capabilities each needs and errors each can raise.
 */
export const ApiSurface = ({ content }: ApiSurfaceProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const model = useMemo(() => buildApiModel(content), [content]);
  const types = useMemo(() => new Set(model.types), [model]);
  const ops = model.groups.filter(({ kind }) => kind === 'op');
  const services = model.groups.filter(({ kind }) => kind === 'service');

  if (model.groups.length === 0) {
    return (
      <Status.Empty classNames='dx-fill' data-testid='api-surface.empty'>
        {t('api-surface.empty.message')}
      </Status.Empty>
    );
  }

  const section = (label: string, groups: ApiGroupModel[]) =>
    groups.length > 0 && (
      <>
        <div
          role='row'
          className='col-span-full mt-4 first:mt-0 pb-1 border-b border-separator text-xs uppercase tracking-wide text-description'
        >
          {label}
        </div>
        {groups.map((group) => (
          <GroupRows key={group.id} group={group} effects={model.effects} types={types} />
        ))}
      </>
    );

  return (
    <ScrollArea.Root orientation='vertical' classNames='dx-fill' data-testid='api-surface'>
      <ScrollArea.Viewport>
        <Layout.Grid
          role='table'
          cols={[3, ...model.effects.map((): Layout.GridTrack => '2.5rem'), 2]}
          gap='sm'
          align='start'
          classNames='p-4'
        >
          <div role='row' className='contents'>
            <div role='columnheader' className='text-xs text-description'>
              {t('api-surface.signature.label')}
            </div>
            {model.effects.map((effect) => (
              // Rotated so effect names of any length fit a narrow column.
              <Layout.Flex key={effect} role='columnheader' justify='center' classNames='h-20'>
                <span className='text-xs text-description [writing-mode:vertical-rl] rotate-180 truncate'>
                  {effect}
                </span>
              </Layout.Flex>
            ))}
            <div role='columnheader' className='text-xs text-description'>
              {t('api-surface.needs.label')}
            </div>
          </div>
          {section(t('api-surface.operations.label'), ops)}
          {section(t('api-surface.services.label'), services)}
        </Layout.Grid>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
