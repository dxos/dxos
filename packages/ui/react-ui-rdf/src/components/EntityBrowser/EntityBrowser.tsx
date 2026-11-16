//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { type KeyboardEvent, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useComposedRefs } from '@dxos/react-hooks';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Field from '@dxos/react-ui/Field';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Util from '@dxos/react-ui/Util';

import { translationKey } from '#translations';

import { useWindowedRows } from '../../hooks/index.ts';
import {
  type BrowseSelection,
  type EntityCardModel,
  type EntitySource,
  type EntityTypeCount,
  type WindowRequest,
  idsEntitySource,
  memoryEntitySource,
  related,
  statements,
} from '../../model/index.ts';
import { TypeFilter } from '../TypeFilter/index.ts';
import { VirtualList } from '../VirtualList/index.ts';
import { EntityCard, type EntityCardProps } from './EntityCard.tsx';
import { KnowledgeCard } from './KnowledgeCard.tsx';

export type EntityBrowserProps = {
  /** Entities held in memory; ignored when a `source` is given. */
  cards?: readonly EntityCardModel[];
  /** Where the entities come from, a window at a time (a fact store); `cards` in memory otherwise. */
  source?: EntitySource;
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

/** What a column lists: every entity (the first), or those a choice relates to, then the statements it opened. */
type Column = { ids?: readonly string[]; texts: readonly string[] };

/** A card's height before it is measured: a type, a name and a couple of property rows. */
const ESTIMATED_CARD_HEIGHT = 160;

/** Space between cards, and above the first and below the last, in px. */
const ROW_GAP = 8;

/** How long typing pauses before the filter reaches the source. */
const FILTER_DELAY = 150;

const getCardId = (card: EntityCardModel): string => card.id;

type ColumnProps = Pick<EntityBrowserProps, 'icons' | 'hues'> & {
  source: EntitySource;
  texts: readonly string[];
  /** Shows a toggle per entity class above the list, which narrows it to that class. */
  typeFilter?: boolean;
  selection?: BrowseSelection;
  onChoose: (selection: BrowseSelection) => void;
  /** Reports the cards the column loaded, so a choice among them can open the next column. */
  onCards: (cards: Iterable<EntityCardModel>) => void;
  /** Closes this column (and every one after it); absent on the first, which always shows the whole graph. */
  onClose?: () => void;
  /** Left and right arrows, which leave the column for its neighbour. */
  onNavigate?: (direction: 'left' | 'right') => void;
};

const CARD_SELECTOR = '[data-testid="entity-card"]';

/**
 * One column: a filter and the close action in its toolbar, over a stack of cards that up and down arrows move through
 * (each card focused is chosen, as in Finder) and left and right leave. Rows load from the source as they scroll in: a
 * row shows its name and class first, then what the card states.
 */
const EntityBrowserColumn = forwardRef<HTMLDivElement, ColumnProps>(
  ({ source, texts, typeFilter, selection, icons, hues, onChoose, onCards, onClose, onNavigate }, forwardedRef) => {
    const { t } = Hooks.useTranslation(translationKey);
    const [filter, setFilter] = useState('');
    const [text, setText] = useState('');
    const [type, setType] = useState<string | undefined>(undefined);
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
    const [stackElement, setStackElement] = useState<HTMLDivElement | null>(null);
    const stackRef = useComposedRefs<HTMLDivElement>(forwardedRef, setStackElement);

    useEffect(() => {
      const timeout = setTimeout(() => setText(filter.trim()), FILTER_DELAY);
      return () => clearTimeout(timeout);
    }, [filter]);

    const load = useCallback(
      (request: Pick<WindowRequest, 'offset' | 'limit'>) =>
        source.window({ ...request, ...(type ? { type } : {}), ...(text ? { text } : {}) }),
      [source, type, text],
    );
    const details = useCallback(
      (items: readonly EntityCardModel[]) =>
        source
          .cards(items.map(getCardId))
          .pipe(Effect.map((cards) => new Map(cards.map((card): [string, EntityCardModel] => [card.id, card])))),
      [source],
    );
    const windowed = useWindowedRows({ load, details, getId: getCardId });

    // The counts ignore the class filter, so they survive it; kept across reloads so the row does not flicker.
    const typesRef = useRef<readonly EntityTypeCount[]>([]);
    if (windowed.types.length > 0) {
      typesRef.current = windowed.types;
    }
    const types = typeFilter ? typesRef.current : [];
    // A class the entities no longer state (the scope changed under it) is dropped rather than filtering out everything.
    useEffect(() => {
      if (type && windowed.types.length > 0 && !windowed.types.some((entry) => entry.type === type)) {
        setType(undefined);
      }
    }, [type, windowed.types]);

    const { loaded } = windowed;
    useEffect(() => {
      const cards: EntityCardModel[] = [];
      for (const [, card] of loaded()) {
        if (card) {
          cards.push(card);
        }
      }
      onCards(cards);
    }, [loaded, onCards]);

    const total = windowed.total ?? 0;
    // Statements have no class, so a class filter leaves them out.
    const shownTexts = useMemo(
      () => (type ? [] : texts.filter((value) => value.toLowerCase().includes(text.toLowerCase()))),
      [texts, text, type],
    );
    const count = total + shownTexts.length;
    const activeIndex = selection ? windowed.indexOf(selection.cardId) : -1;
    const activeIndexRef = useRef(activeIndex);
    activeIndexRef.current = activeIndex;

    // A narrower filter shortens the list under the old offset, so it starts again from the top, unless the chosen card
    // survived it, which the list keeps in view instead.
    useEffect(() => {
      if (viewport && activeIndexRef.current < 0) {
        viewport.scrollTop = 0;
      }
    }, [viewport, text, type]);

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

    const renderItem = (index: number) => {
      if (index >= total) {
        return (
          <KnowledgeCard
            icon='ph--quotes--regular'
            title={shownTexts[index - total]}
            rows={[]}
            testId='entity-statement'
          />
        );
      }
      const summary = windowed.item(index);
      if (!summary) {
        // Holds the row's place at about a card's height until its page arrives.
        return <div role='none' className='h-24 rounded-sm bg-card-surface' data-testid='entity-card-placeholder' />;
      }
      const card = windowed.detail(summary.id) ?? summary;
      const chosen = selection?.cardId === card.id;
      return (
        <Focus.Item asChild current={chosen} onCurrentChange={() => onChoose({ cardId: card.id })}>
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
    };

    const getKey = (index: number): string => {
      if (index >= total) {
        return `text:${shownTexts[index - total]}`;
      }
      const summary = windowed.item(index);
      return summary ? `card:${summary.id}` : `pending:${index}`;
    };

    return (
      <Panel.Root data-testid='entity-browser-column'>
        <Panel.Header>
          <ActionToolbar {...menuActions} alwaysActive />
          {types.length > 0 && <TypeFilter types={types} value={type} onValueChange={setType} />}
        </Panel.Header>
        <Panel.Body asChild>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport ref={setViewport}>
              {windowed.error ? (
                <Status.Empty>{windowed.error}</Status.Empty>
              ) : windowed.total === undefined && shownTexts.length === 0 ? (
                <Status.Empty>{t('entity-browser-loading.message')}</Status.Empty>
              ) : count === 0 ? (
                <Status.Empty>{t('entity-browser-empty.message')}</Status.Empty>
              ) : (
                <Focus.Group asChild onKeyDown={handleKeyDown} ref={stackRef}>
                  <VirtualList
                    count={count}
                    getKey={getKey}
                    renderItem={renderItem}
                    onRangeChange={windowed.onRangeChange}
                    scrollElement={viewport}
                    estimateSize={ESTIMATED_CARD_HEIGHT}
                    gap={ROW_GAP}
                    padding={ROW_GAP}
                    activeIndex={activeIndex}
                    classNames='px-2'
                  />
                </Focus.Group>
              )}
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
 * or one chip in a column opens the next column on what that choice relates to. Each column filters its own stack, and
 * loads only the rows in view from the source.
 */
// Composable, so a host's `Panel.Body asChild` makes the scroll frame its growing row.
export const EntityBrowser = Util.composable<HTMLDivElement, EntityBrowserProps>((allProps, forwardedRef) => {
  const { cards, source: sourceProp, icons, hues, selected, onSelect, ...props } = allProps;
  // An uncontrolled caller omits `selected`, so its absence must not close the columns the user opened.
  const controlled = 'selected' in allProps;
  const source = useMemo(() => sourceProp ?? memoryEntitySource(cards ?? []), [sourceProp, cards]);
  // Every card a column loaded (or a choice fetched), by id: a choice opens the next column from its card.
  const [known, setKnown] = useState<ReadonlyMap<string, EntityCardModel>>(() => new Map());
  // One entry per column that has chosen something; choosing in a column drops every choice after it.
  const [path, setPath] = useState<BrowseSelection[]>([]);
  const stackRefs = useRef<(HTMLDivElement | null)[]>([]);
  // The entity last reported, so a `selected` that echoes it does not reset the columns it came from.
  const reportedRef = useRef<string | undefined>(undefined);

  // A new source holds other entities, so what was learned from the last one is dropped.
  useEffect(() => setKnown(new Map()), [source]);

  const handleCards = useCallback((loaded: Iterable<EntityCardModel>) => {
    setKnown((current) => {
      let next: Map<string, EntityCardModel> | undefined;
      for (const card of loaded) {
        if (current.get(card.id) !== card) {
          next ??= new Map(current);
          next.set(card.id, card);
        }
      }
      return next ?? current;
    });
  }, []);

  const update = (next: BrowseSelection[]) => {
    setPath(next);
    const entity = chosenEntity(next);
    if (entity !== reportedRef.current) {
      reportedRef.current = entity;
      onSelect?.(entity);
    }
  };

  useEffect(() => {
    if (!controlled || selected === reportedRef.current) {
      return;
    }
    reportedRef.current = selected;
    setPath(selected === undefined ? [] : [{ cardId: selected }]);
  }, [controlled, selected]);

  // A chosen card no column has loaded (one chosen from outside) is fetched, so the column it opens can follow.
  const missing = path.find((selection) => !known.has(selection.cardId))?.cardId;
  useEffect(() => {
    if (missing === undefined) {
      return;
    }
    const fiber = Effect.runFork(
      source.cards([missing]).pipe(
        Effect.tap((found) => Effect.sync(() => handleCards(found))),
        Effect.catchCause(() => Effect.void),
      ),
    );
    return () => void Effect.runFork(Fiber.interrupt(fiber));
  }, [missing, source, handleCards]);

  // Into the next column at its first card, or back to the card chosen in the previous one.
  const navigate = (column: number, direction: 'left' | 'right') => {
    const target = stackRefs.current[direction === 'left' ? column - 1 : column + 1];
    const card =
      (direction === 'left' && target?.querySelector<HTMLElement>(`${CARD_SELECTOR}[aria-current="true"]`)) ||
      target?.querySelector<HTMLElement>(CARD_SELECTOR);
    card?.focus();
  };

  const columns = useMemo(() => {
    const result: Column[] = [{ texts: [] }];
    for (const selection of path) {
      const card = known.get(selection.cardId);
      if (!card) {
        break;
      }
      const ids = related(card, selection);
      // A property can hold entities and text alike, so its column shows both.
      const texts = statements(card, selection);
      if (ids.length === 0 && texts.length === 0) {
        break;
      }
      result.push({ ids, texts });
      // A statement links to nothing further, so a column of only statements ends the chain.
      if (ids.length === 0) {
        break;
      }
    }
    return result;
  }, [known, path]);

  return (
    // Columns sizes them to whole shares of the width and, like Finder, scrolls the one a choice opens into view.
    <Layout.Columns {...props} minColumnWidth={24} ref={forwardedRef}>
      {columns.map((stack, column) => (
        <ColumnWithSource
          ref={(element) => {
            stackRefs.current[column] = element;
          }}
          onNavigate={(direction) => navigate(column, direction)}
          // Keyed by what opened the column, so its filter resets when a new choice replaces it.
          key={column === 0 ? 'root' : JSON.stringify(path[column - 1])}
          source={source}
          ids={stack.ids}
          texts={stack.texts}
          // The first column holds the whole graph, where narrowing by class is worth a row of its own.
          typeFilter={column === 0}
          selection={path[column]}
          icons={icons}
          hues={hues}
          onChoose={(selection) => update([...path.slice(0, column), selection])}
          onCards={handleCards}
          onClose={column === 0 ? undefined : () => update(path.slice(0, column - 1))}
        />
      ))}
    </Layout.Columns>
  );
});

EntityBrowser.displayName = 'EntityBrowser';

/** A column over the whole source, or over the entities a choice related, which it loads through the same source. */
const ColumnWithSource = forwardRef<HTMLDivElement, ColumnProps & { ids?: readonly string[] }>(
  ({ source, ids, ...props }, forwardedRef) => {
    // The ids are recomputed with every card the browser learns, so the column's source follows their content; keys
    // hold no NUL, so joining on it keeps them apart.
    const idsKey = ids?.join(ID_SEPARATOR);
    const columnSource = useMemo(
      () => (idsKey === undefined ? source : idsEntitySource(source, idsKey ? idsKey.split(ID_SEPARATOR) : [])),
      [source, idsKey],
    );
    return <EntityBrowserColumn {...props} source={columnSource} ref={forwardedRef} />;
  },
);

const ID_SEPARATOR = '\u0000';

ColumnWithSource.displayName = 'EntityBrowser.ColumnWithSource';
