//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { meta } from '#meta';

import { EntityCard } from './EntityCard.tsx';
import { type BrowseSelection, type EntityCardModel, related } from './subgraph.ts';

export type EntityBrowserProps = {
  cards: readonly EntityCardModel[];
  /** Icons by normalized predicate, passed to each card. */
  icons?: Readonly<Record<string, string>>;
};

/** Whether a card matches a column's filter, by its name or its type. */
const matches = (card: EntityCardModel, filter: string): boolean => {
  const text = filter.trim().toLowerCase();
  return !text || card.label.toLowerCase().includes(text) || !!card.type?.toLowerCase().includes(text);
};

type ColumnProps = Pick<EntityBrowserProps, 'icons'> & {
  stack: readonly EntityCardModel[];
  selection?: BrowseSelection;
  onChoose: (selection: BrowseSelection) => void;
  /** Closes this column (and every one after it); absent on the first, which always shows the whole graph. */
  onClose?: () => void;
};

/** One column: a filter and the close action in its toolbar, over a stack of cards. */
const EntityBrowserColumn = ({ stack, selection, icons, onChoose, onClose }: ColumnProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [filter, setFilter] = useState('');
  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().root({ label: ['entity-browser-actions.label', { ns: meta.profile.key }] });
    if (onClose) {
      builder.action(
        'close',
        {
          label: ['entity-browser-close.label', { ns: meta.profile.key }],
          icon: 'ph--x--regular',
          iconOnly: true,
          testId: 'entity-browser-close',
        },
        () => onClose(),
      );
    }
    return builder.build();
  }, [onClose]);

  return (
    <Panel.Root data-testid='entity-browser-column'>
      <Panel.Header>
        <ActionToolbar
          {...menuActions}
          alwaysActive
          start={
            <Field.Root>
              <Input.Root
                placeholder={t('entity-browser-filter.placeholder')}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </Field.Root>
          }
        />
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Layout.Flex column gap='sm' classNames='p-2'>
              {stack
                .filter((card) => matches(card, filter))
                .map((card) => {
                  const chosen = selection?.cardId === card.id;
                  return (
                    <EntityCard
                      key={card.id}
                      card={card}
                      icons={icons}
                      selected={chosen}
                      currentProperty={chosen ? selection?.property : undefined}
                      onClick={() => onChoose({ cardId: card.id })}
                      onSelectProperty={(property) => onChoose({ cardId: card.id, property })}
                      onSelect={(entity, property) => onChoose({ cardId: card.id, property, entity })}
                    />
                  );
                })}
            </Layout.Flex>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

/**
 * The fact graph as Finder-style columns: the first holds every entity, and choosing a card, one of its property rows,
 * or one chip in a column opens the next column on what that choice relates to. Each column filters its own stack.
 */
export const EntityBrowser = ({ cards, icons }: EntityBrowserProps) => {
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  // One entry per column that has chosen something; choosing in a column drops every choice after it.
  const [path, setPath] = useState<BrowseSelection[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => {
    const result: EntityCardModel[][] = [[...cards]];
    for (const selection of path) {
      const card = byId.get(selection.cardId);
      const next = card ? related(card, selection).flatMap((id) => byId.get(id) ?? []) : [];
      if (next.length === 0) {
        break;
      }
      result.push(next);
    }
    return result;
  }, [cards, byId, path]);

  // Like Finder, the column a choice opens scrolls into view.
  useEffect(() => {
    viewportRef.current?.scrollTo({ left: viewportRef.current.scrollWidth, behavior: 'smooth' });
  }, [columns.length]);

  return (
    <Panel.Root>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='horizontal' autoHide={false}>
          <ScrollArea.Viewport ref={viewportRef}>
            <Layout.Grid cols={columns.map(() => '24rem')} rows={['fill']} classNames='h-full'>
              {columns.map((stack, column) => (
                <EntityBrowserColumn
                  // Keyed by what opened the column, so its filter resets when a new choice replaces it.
                  key={column === 0 ? 'root' : JSON.stringify(path[column - 1])}
                  stack={stack}
                  selection={path[column]}
                  icons={icons}
                  onChoose={(selection) => setPath((current) => [...current.slice(0, column), selection])}
                  onClose={column === 0 ? undefined : () => setPath((current) => current.slice(0, column - 1))}
                />
              ))}
            </Layout.Grid>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

EntityBrowser.displayName = 'EntityBrowser';
