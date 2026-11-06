//
// Copyright 2026 DXOS.org
//

import React, { type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import { type DecisionModel } from '../ChangelogGraph/index.ts';
import { type DefinitionEdge, STATUS_STYLE } from '../SpecModel/index.ts';
import { type Connector, ConnectorLayer } from './Connectors.tsx';
import { CHANGE_FRAME, type DefinitionViewModel } from './DefinitionChip.tsx';

/** A neighbour of the focused block and how the two are linked. */
type Neighbour = { id: string; fields: string[] };

type NodeCardProps = {
  view: DefinitionViewModel;
  id: string;
  /** The fields that link it to the focus. */
  via?: Neighbour;
  focused?: boolean;
  /** The connector end it answers to; a block both above and below the focus has one per row. */
  node?: string;
  onOpen?: (id: string) => void;
};

/** A block as a small card: its kind, id and title, and what links it to the focus. */
const NodeCard = ({ view, id, via, focused, node = id, onOpen }: NodeCardProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const definition = view.byId.get(id);
  if (!definition) {
    return null;
  }
  const status = definition.external ? undefined : view.statusOf(id);
  const change = view.changeOf(id);
  const { icon, hue } = definition.style;
  return (
    <button
      type='button'
      className={mx(
        'flex flex-col gap-1 p-2 rounded-md border text-start dx-focus-ring',
        focused ? 'w-64 border-2 border-accent-text bg-current-surface' : 'w-44 border-separator bg-base-surface',
        definition.external && 'border-dashed',
        change && CHANGE_FRAME[change],
      )}
      onClick={() => onOpen?.(id)}
      data-node={node}
      data-testid={focused ? 'definition-related.focus' : 'definition-related.node'}
      data-definition={id}
      data-kind={definition.kind}
      data-change={change}
    >
      <span className='flex items-center gap-1 min-w-0'>
        <Icon.Icon icon={icon} size='xs' classNames='shrink-0' />
        <span className={mx('font-mono truncate', focused ? 'text-base font-medium' : 'text-xs')}>
          {definition.external?.fragment ?? id}
        </span>
        {status && (
          <Icon.Icon
            icon={STATUS_STYLE[status].icon}
            size='xs'
            classNames={mx('shrink-0', STATUS_STYLE[status].text)}
          />
        )}
      </span>
      {definition.title && definition.title !== id && (
        <span className={mx('text-description line-clamp-2', focused ? 'text-sm' : 'text-xs')}>{definition.title}</span>
      )}
      <span className='flex flex-wrap gap-1'>
        <Tag.Tag hue={hue}>{definition.kind}</Tag.Tag>
        {via?.fields.map((field) => (
          <Tag.Tag key={field} data-testid='definition-graph.via'>
            <Icon.Icon icon='ph--link-simple--regular' size='xs' />
            {field}
          </Tag.Tag>
        ))}
      </span>
    </button>
  );
};

/** The neighbours at one end of the focus's edges, each with the fields that link them. */
const neighboursOf = (edges: readonly DefinitionEdge[], focus: string, end: 'from' | 'to'): Neighbour[] => {
  const byId = new Map<string, Neighbour>();
  for (const edge of edges) {
    const [near, far] = end === 'to' ? [edge.from, edge.to] : [edge.to, edge.from];
    if (near === focus && far !== focus) {
      const neighbour = byId.get(far) ?? { id: far, fields: [] };
      edge.field && !neighbour.fields.includes(edge.field) && neighbour.fields.push(edge.field);
      byId.set(far, neighbour);
    }
  }
  return [...byId.values()];
};

/** Whether a row of cards has wrapped onto more than one line, checked again whenever it resizes. */
const useWrapped = (row: RefObject<HTMLElement | null>, deps: readonly unknown[]): boolean => {
  const [wrapped, setWrapped] = useState(false);
  useEffect(() => {
    const element = row.current;
    if (!element) {
      setWrapped(false);
      return;
    }
    const check = () => {
      const cards = element.children;
      setWrapped(
        cards.length > 1 && (cards[cards.length - 1] as HTMLElement).offsetTop > (cards[0] as HTMLElement).offsetTop,
      );
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, deps);
  return wrapped;
};

/** Whether a decision names the block or one of its parts (`F-14.1` is part of `F-14`). */
const affects = (decision: DecisionModel, id: string) =>
  decision.entry.affects.some((block) => block === id || block.startsWith(`${id}.`));

/** Connector ends for each row as a whole, once it wraps; a card in a row answers to `${row}:${id}`. */
const ABOVE = 'related:above';
const BELOW = 'related:below';

export type DefinitionRelatedProps = {
  view: DefinitionViewModel;
  /** Every edge of the spec, so the anchors naming it are drawn even when its view hides their kind. */
  edges: readonly DefinitionEdge[];
  decisions: readonly DecisionModel[];
  /** The block drawn in the middle. */
  focus: string;
  /** Makes another block the focus. */
  onOpen: (id: string) => void;
  /** Shows the focus in the spec. */
  onShow?: (id: string) => void;
};

/**
 * One block and everything that touches it. What names it sits above, anchors first, with an arrow into it; what it
 * names sits below, with an arrow out. The checks that name it and the live decisions that affect it are listed under
 * the graph. A row that wraps gets one arrow for the whole row, since an arrow per card would cross the cards under it.
 * Any card makes its block the focus.
 */
export const DefinitionRelated = ({ view, edges, decisions, focus, onOpen, onShow }: DefinitionRelatedProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const container = useRef<HTMLDivElement>(null);
  const roleOf = (id: string) => view.byId.get(id)?.role;
  const { above, below, checks } = useMemo(() => {
    const incoming = neighboursOf(edges, focus, 'from');
    const isCheck = ({ id }: Neighbour) => roleOf(id) === 'verification';
    const anchorsFirst = (a: Neighbour, b: Neighbour) =>
      Number(roleOf(b.id) === 'anchor') - Number(roleOf(a.id) === 'anchor');
    return {
      above: incoming.filter((neighbour) => !isCheck(neighbour)).sort(anchorsFirst),
      below: neighboursOf(edges, focus, 'to').filter((neighbour) => !isCheck(neighbour)),
      checks: incoming.filter(isCheck),
    };
  }, [edges, focus, view]);
  const aboveRow = useRef<HTMLDivElement>(null);
  const belowRow = useRef<HTMLDivElement>(null);
  const aboveWrapped = useWrapped(aboveRow, [above]);
  const belowWrapped = useWrapped(belowRow, [below]);
  const connectors = useMemo<Connector[]>(
    () => [
      ...(aboveWrapped
        ? [{ id: `${ABOVE}->${focus}`, from: ABOVE, to: focus }]
        : above.map(({ id }) => ({ id: `${id}->${focus}`, from: `${ABOVE}:${id}`, to: focus }))),
      ...(belowWrapped
        ? [{ id: `${focus}->${BELOW}`, from: focus, to: BELOW }]
        : below.map(({ id }) => ({ id: `${focus}->${id}`, from: focus, to: `${BELOW}:${id}` }))),
    ],
    [above, below, focus, aboveWrapped, belowWrapped],
  );
  const live = useMemo(
    () => decisions.filter((decision) => !decision.supersededBy && affects(decision, focus)).reverse(),
    [decisions, focus],
  );

  const row = (
    neighbours: readonly Neighbour[],
    node: string,
    ref: RefObject<HTMLDivElement | null>,
    testId: string,
  ) => (
    <div
      ref={ref}
      className={mx('flex flex-wrap justify-center gap-3', neighbours.length > 1 && 'p-3 rounded-lg bg-group-surface')}
      data-node={node}
      data-testid={testId}
    >
      {neighbours.map((neighbour) => (
        <NodeCard
          key={neighbour.id}
          view={view}
          id={neighbour.id}
          via={neighbour}
          node={`${node}:${neighbour.id}`}
          onOpen={onOpen}
        />
      ))}
    </div>
  );

  return (
    <div className='flex flex-col gap-6' data-testid='definition-related'>
      <div ref={container} className='relative flex flex-col items-center gap-12 py-2'>
        {above.length > 0 ? (
          row(above, ABOVE, aboveRow, 'definition-related.above')
        ) : (
          <span className='text-xs text-description'>{t('definition-related.above.empty')}</span>
        )}
        <div className='flex flex-col items-center gap-1'>
          <NodeCard view={view} id={focus} focused onOpen={onShow} />
        </div>
        {below.length > 0 ? (
          row(below, BELOW, belowRow, 'definition-related.below')
        ) : (
          <span className='text-xs text-description'>{t('definition-related.below.empty')}</span>
        )}
        <ConnectorLayer container={container} connectors={connectors} />
      </div>
      <section className='flex flex-col gap-2' data-testid='definition-related.checks'>
        <span className='text-xs font-medium text-description'>
          {t('definition-related.checks.label', { count: checks.length })}
        </span>
        {checks.length > 0 ? (
          <div className='flex flex-wrap gap-2'>
            {checks.map((neighbour) => (
              <NodeCard key={neighbour.id} view={view} id={neighbour.id} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <span className='text-sm text-warning-text' data-testid='definition-related.no-checks'>
            {t('definition-related.checks.empty')}
          </span>
        )}
      </section>
      <section className='flex flex-col gap-1' data-testid='definition-related.decisions'>
        <span className='text-xs font-medium text-description'>
          {t('definition-related.decisions.label', { count: live.length })}
        </span>
        {live.length === 0 && (
          <span className='text-sm text-description'>{t('definition-related.decisions.empty')}</span>
        )}
        {live.map(({ entry }) => (
          <div key={entry.id} className='flex gap-2 text-sm min-w-0' data-testid='definition-related.decision'>
            <span className='shrink-0 font-mono text-xs text-description pt-0.5'>{entry.id}</span>
            <span className='line-clamp-2'>{entry.title}</span>
          </div>
        ))}
      </section>
      {onShow && (
        <Button.Root
          variant='ghost'
          icon='ph--text-align-left--regular'
          label={t('definition-related.show.label')}
          onClick={() => onShow(focus)}
          classNames='self-start'
          data-testid='definition-related.show'
        />
      )}
    </div>
  );
};
