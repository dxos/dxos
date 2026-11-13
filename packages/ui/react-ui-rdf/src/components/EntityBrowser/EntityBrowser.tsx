//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { useComposedRefs } from '@dxos/react-hooks';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Field from '@dxos/react-ui/Field';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Util from '@dxos/react-ui/Util';

import { translationKey } from '#translations';

import { type BrowseSelection, type EntityCardModel, related, statements } from '../../model/index.ts';
import { EntityCard, type EntityCardProps } from './EntityCard.tsx';
import { KnowledgeCard } from './KnowledgeCard.tsx';

export type EntityBrowserProps = {
  cards: readonly EntityCardModel[];
  /** Icons by normalized predicate, passed to each card. */
  icons?: Readonly<Record<string, string>>;
  /** Chip hues by entity type, passed to each card. */
  hues?: EntityCardProps['hues'];
  /** The chosen entity; a change from outside reopens the browser on that entity's card (or closes every column). */
  selected?: string;
  /** Called with the entity the latest choice names (a chip's entity, else its card), or undefined once none is. */
  onSelect?: (id: string | undefined) => void;
};

/** The entity a path of choices ends on. */
const chosenEntity = (path: readonly BrowseSelection[]): string | undefined => {
  const last = path.at(-1);
  return last?.entity ?? last?.cardId;
};

/** Whether a card matches a column's filter, by its name or its type. */
const matches = (card: EntityCardModel, filter: string): boolean => {
  const text = filter.trim().toLowerCase();
  return !text || card.label.toLowerCase().includes(text) || !!card.type?.toLowerCase().includes(text);
};

/** What a column stacks: entity cards, then the statements (a memory's claims) of the property that opened it. */
type Column = { cards: readonly EntityCardModel[]; texts: readonly string[] };

type ColumnProps = Pick<EntityBrowserProps, 'icons' | 'hues'> & {
  column: Column;
  selection?: BrowseSelection;
  onChoose: (selection: BrowseSelection) => void;
  /** Closes this column (and every one after it); absent on the first, which always shows the whole graph. */
  onClose?: () => void;
  /** Left and right arrows, which leave the column for its neighbour. */
  onNavigate?: (direction: 'left' | 'right') => void;
};

const CARD_SELECTOR = '[data-testid="entity-card"]';

/**
 * One column: a filter and the close action in its toolbar, over a stack of cards that up and down arrows move through
 * (each card focused is chosen, as in Finder) and left and right leave.
 */
const EntityBrowserColumn = forwardRef<HTMLDivElement, ColumnProps>(
  ({ column, selection, icons, hues, onChoose, onClose, onNavigate }, forwardedRef) => {
    const { t } = Hooks.useTranslation(translationKey);
    const [filter, setFilter] = useState('');
    const [stackElement, setStackElement] = useState<HTMLDivElement | null>(null);
    const stackRef = useComposedRefs<HTMLDivElement>(forwardedRef, setStackElement);

    // Focus chooses the card it lands on (as in Finder); a card already chosen keeps its finer choice (a row, a chip).
    useEffect(() => {
      if (!stackElement) {
        return;
      }
      const handleFocusIn = (event: FocusEvent) => {
        const card = event.target instanceof Element ? event.target.closest('[data-entity-id]') : null;
        const id = card?.getAttribute('data-entity-id');
        if (id && id !== selection?.cardId) {
          onChoose({ cardId: id });
        }
      };
      stackElement.addEventListener('focusin', handleFocusIn);
      return () => stackElement.removeEventListener('focusin', handleFocusIn);
    }, [stackElement, selection?.cardId, onChoose]);
    const menuActions = useMenuBuilder(() => {
      const builder = MenuBuilder.make().root({ label: ['entity-browser-actions.label', { ns: translationKey }] });
      builder.custom('filter', { label: ['entity-browser-filter.placeholder', { ns: translationKey }] }, () => (
        <Field.Root>
          <Input.Root
            placeholder={t('entity-browser-filter.placeholder')}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </Field.Root>
      ));
      if (onClose) {
        builder.action(
          'close',
          {
            label: ['entity-browser-close.label', { ns: translationKey }],
            icon: 'ph--x--regular',
            iconOnly: true,
            testId: 'entity-browser-close',
          },
          () => onClose(),
        );
      }
      return builder.build();
    }, [onClose, filter, t]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        onNavigate?.(event.key === 'ArrowLeft' ? 'left' : 'right');
      }
    };

    return (
      <Panel.Root data-testid='entity-browser-column'>
        <Panel.Header>
          <ActionToolbar {...menuActions} alwaysActive />
        </Panel.Header>
        <Panel.Body asChild>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport>
              <Focus.Group asChild onKeyDown={handleKeyDown} ref={stackRef}>
                <Layout.Flex column gap='sm' classNames='p-2'>
                  {column.cards
                    .filter((card) => matches(card, filter))
                    .map((card) => {
                      const chosen = selection?.cardId === card.id;
                      return (
                        <Focus.Item
                          key={card.id}
                          asChild
                          current={chosen}
                          onCurrentChange={() => onChoose({ cardId: card.id })}
                        >
                          <EntityCard
                            card={card}
                            icons={icons}
                            hues={hues}
                            selected={chosen}
                            currentProperty={chosen ? selection?.property : undefined}
                            onSelectProperty={(property) => onChoose({ cardId: card.id, property })}
                            onSelect={(entity, property) => onChoose({ cardId: card.id, property, entity })}
                          />
                        </Focus.Item>
                      );
                    })}
                  {column.texts
                    .filter((text) => text.toLowerCase().includes(filter.trim().toLowerCase()))
                    .map((text) => (
                      <KnowledgeCard
                        key={text}
                        icon='ph--quotes--regular'
                        title={text}
                        rows={[]}
                        testId='entity-statement'
                      />
                    ))}
                </Layout.Flex>
              </Focus.Group>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Panel.Root>
    );
  },
);

EntityBrowserColumn.displayName = 'EntityBrowser.Column';

/**
 * The fact graph as Finder-style columns: the first holds every entity, and choosing a card, one of its property rows,
 * or one chip in a column opens the next column on what that choice relates to. Each column filters its own stack.
 */
// Composable, so a host's `Panel.Body asChild` makes the scroll frame its growing row.
export const EntityBrowser = Util.composable<HTMLDivElement, EntityBrowserProps>(
  ({ cards, icons, hues, selected, onSelect, ...props }, forwardedRef) => {
    const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
    // One entry per column that has chosen something; choosing in a column drops every choice after it.
    const [path, setPath] = useState<BrowseSelection[]>([]);
    const stackRefs = useRef<(HTMLDivElement | null)[]>([]);
    // The entity last reported, so a `selected` that echoes it does not reset the columns it came from.
    const reportedRef = useRef<string | undefined>(undefined);

    const update = (next: BrowseSelection[]) => {
      setPath(next);
      const entity = chosenEntity(next);
      if (entity !== reportedRef.current) {
        reportedRef.current = entity;
        onSelect?.(entity);
      }
    };

    useEffect(() => {
      if (selected === reportedRef.current) {
        return;
      }
      reportedRef.current = selected;
      setPath(selected && byId.has(selected) ? [{ cardId: selected }] : []);
    }, [selected, byId]);

    // Into the next column at its first card, or back to the card chosen in the previous one.
    const navigate = (column: number, direction: 'left' | 'right') => {
      const target = stackRefs.current[direction === 'left' ? column - 1 : column + 1];
      const card =
        (direction === 'left' && target?.querySelector<HTMLElement>(`${CARD_SELECTOR}[aria-current="true"]`)) ||
        target?.querySelector<HTMLElement>(CARD_SELECTOR);
      card?.focus();
    };

    const columns = useMemo(() => {
      const result: Column[] = [{ cards, texts: [] }];
      for (const selection of path) {
        const card = byId.get(selection.cardId);
        const next = card ? related(card, selection).flatMap((id) => byId.get(id) ?? []) : [];
        // A property can hold entities and text alike, so its column shows both.
        const texts = card ? statements(card, selection) : [];
        if (next.length === 0 && texts.length === 0) {
          break;
        }
        result.push({ cards: next, texts });
        // A statement links to nothing further, so a column of only statements ends the chain.
        if (next.length === 0) {
          break;
        }
      }
      return result;
    }, [cards, byId, path]);

    return (
      // Columns sizes them to whole shares of the width and, like Finder, scrolls the one a choice opens into view.
      <Layout.Columns {...props} minColumnWidth={24} ref={forwardedRef}>
        {columns.map((stack, column) => (
          <EntityBrowserColumn
            ref={(element) => {
              stackRefs.current[column] = element;
            }}
            onNavigate={(direction) => navigate(column, direction)}
            // Keyed by what opened the column, so its filter resets when a new choice replaces it.
            key={column === 0 ? 'root' : JSON.stringify(path[column - 1])}
            column={stack}
            selection={path[column]}
            icons={icons}
            hues={hues}
            onChoose={(selection) => update([...path.slice(0, column), selection])}
            onClose={column === 0 ? undefined : () => update(path.slice(0, column - 1))}
          />
        ))}
      </Layout.Columns>
    );
  },
);

EntityBrowser.displayName = 'EntityBrowser';
