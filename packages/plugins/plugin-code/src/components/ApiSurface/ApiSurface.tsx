//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useMemo } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

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
        <span className='text-description'> → </span>
        <TypeExpr expr={endpoint.output} types={types} />
      </>
    )}
  </code>
);

type GroupRowsProps = { group: ApiGroupModel; effects: string[]; types: ReadonlySet<string> };

/** An op is one row; a service is a heading row then one row per method or event, all sharing its effects. */
const GroupRows = ({ group, effects, types }: GroupRowsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { icon } = kindStyle(group.kind);
  const effectCells = (dim: boolean) =>
    effects.map((effect) => (
      <div key={effect} role='cell' className='flex justify-center items-start pt-1'>
        {group.effects.includes(effect) && (
          <span
            className={mx('block size-2.5 rounded-full bg-orange-text', dim && 'opacity-40')}
            title={effect}
            data-testid='api-surface.effect'
          />
        )}
      </div>
    ));
  const trailing = (
    <div role='cell' className='flex flex-wrap gap-1 items-start'>
      {group.requires.map((capability) => (
        <Tag.Tag key={capability} hue='indigo' classNames='font-mono' title={t('api-surface.requires.label')}>
          {capability}
        </Tag.Tag>
      ))}
      {group.errors.map((error) => (
        <Tag.Tag key={error.name} hue='error' title={error.desc}>
          {error.name}
        </Tag.Tag>
      ))}
    </div>
  );

  if (group.kind === 'op') {
    const [endpoint] = group.endpoints;
    return (
      <div role='row' className='contents' data-testid='api-surface.op' data-op={group.id}>
        <div role='cell' className='flex gap-2 items-start min-w-0'>
          <Icon.Icon icon={icon} classNames='text-orange-text mt-0.5 shrink-0' />
          <div className='flex flex-col min-w-0'>
            <Signature endpoint={endpoint} types={types} />
            {endpoint.key && <span className='text-xs text-description font-mono truncate'>{endpoint.key}</span>}
          </div>
        </div>
        {effectCells(false)}
        {trailing}
      </div>
    );
  }

  return (
    <>
      <div role='row' className='contents' data-testid='api-surface.service' data-service={group.id}>
        <div role='cell' className='flex gap-2 items-center min-w-0 pt-2'>
          <Icon.Icon icon={icon} classNames='text-yellow-text shrink-0' />
          <span className='font-medium truncate'>{group.id}</span>
        </div>
        {effectCells(false)}
        {trailing}
      </div>
      {group.endpoints.map((endpoint) => (
        <div key={endpoint.id} role='row' className='contents' data-testid='api-surface.method'>
          <div role='cell' className='flex gap-2 items-start min-w-0 ps-6'>
            <Icon.Icon
              icon={endpoint.event ? 'ph--broadcast--regular' : 'ph--arrow-right--regular'}
              size='sm'
              classNames='text-description mt-0.5 shrink-0'
            />
            <Signature endpoint={endpoint} types={types} />
          </div>
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const model = useMemo(() => buildApiModel(content), [content]);
  const types = useMemo(() => new Set(model.types), [model]);
  const ops = model.groups.filter(({ kind }) => kind === 'op');
  const services = model.groups.filter(({ kind }) => kind === 'service');

  if (model.groups.length === 0) {
    return (
      <Layout.Flex classNames='dx-fill items-center justify-center text-description' data-testid='api-surface.empty'>
        {t('api-surface.empty.message')}
      </Layout.Flex>
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
    <ScrollArea.Root orientation='vertical' data-testid='api-surface'>
      <ScrollArea.Viewport>
        <div
          role='table'
          className='grid gap-x-3 gap-y-2 p-4 items-start'
          style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${model.effects.length}, 2.5rem) minmax(0,18rem)` }}
        >
          <div role='row' className='contents'>
            <div role='columnheader' className='text-xs text-description'>
              {t('api-surface.signature.label')}
            </div>
            {model.effects.map((effect) => (
              // Rotated so effect names of any length fit a narrow column.
              <div key={effect} role='columnheader' className='flex justify-center h-20'>
                <span className='text-xs text-description [writing-mode:vertical-rl] rotate-180 truncate'>
                  {effect}
                </span>
              </div>
            ))}
            <div role='columnheader' className='text-xs text-description'>
              {t('api-surface.needs.label')}
            </div>
          </div>
          {section(t('api-surface.operations.label'), ops)}
          {section(t('api-surface.services.label'), services)}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
