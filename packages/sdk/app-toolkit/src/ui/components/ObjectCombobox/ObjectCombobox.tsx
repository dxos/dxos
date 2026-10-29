//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { type Database, Entity, Filter, Obj, Query, Type } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import * as Combobox from '@dxos/react-ui/Combobox';
import * as Hooks from '@dxos/react-ui/Hooks';
import { hues } from '@dxos/ui-types';

import { TypeOptions } from '../../../echo/index.ts';

/** An object a picker offers: its URI, label and type icon. Structurally a form's `RefOption`. */
export type Option = {
  id: string;
  label: string;
  icon?: string;
  iconHue?: string;
};

export type OptionsProps = {
  /** Translates a type's `object-name.placeholder`, the label of an unnamed object. */
  t: (key: string, options: { ns: string; defaultValue: string }) => string | undefined;
  /** Drops objects the caller should not offer (e.g. the object being edited). */
  filter?: (object: Obj.Unknown) => boolean;
};

/**
 * The objects among `objects` a user finds in the navigator or a Database section, as options sorted by label: each
 * labelled by its name or, unnamed, by its type's placeholder, as the navigator shows it, with its type's icon.
 */
export const toOptions = (objects: readonly Entity.Any[], { t, filter }: OptionsProps): Option[] =>
  listedOptions(objects, { t, filter })
    .map(({ object: _, ...option }) => option)
    .toSorted((left, right) => left.label.localeCompare(right.label));

/** An object's name or, unnamed, its type's placeholder ("New document"), as the navigator shows it. */
export const objectLabel = (object: Obj.Unknown, t: OptionsProps['t']): string => {
  const typename = Obj.getTypename(object);
  return (
    Entity.getLabel(object) ??
    (typename && t('object-name.placeholder', { ns: typename, defaultValue: 'New item' })) ??
    Entity.getURI(object, { prefer: 'named' })
  );
};

const listedOptions = (objects: readonly Entity.Any[], { t, filter }: OptionsProps): SearchOption[] =>
  TypeOptions.filterListedObjects(objects)
    .filter((object) => !filter || filter(object))
    .map((object) => {
      const icon = Entity.getIcon(object);
      return {
        id: Entity.getURI(object, { prefer: 'named' }),
        label: objectLabel(object, t),
        icon: icon?.icon,
        iconHue: icon?.hue,
        object,
      };
    });

const everything = Query.select(Filter.everything());

/** Full-text search over the index; its trigram tokenizer matches a term of three or more characters anywhere in a word. */
export const searchFilter = (text: string): Filter.Any => Filter.text(text, { type: 'full-text' });

/**
 * The query for a search box value. A term routes to the full-text index, scoped to `typeUris` when given: the
 * whole-object index has no per-field choice, so an unscoped search surfaces objects the app never renders. Empty
 * input, and an empty scope, match nothing.
 */
export const searchQuery = (text: string | undefined, typeUris?: readonly URI.URI[]): Query.Any => {
  const trimmed = text?.trim();
  if (!trimmed || (typeUris && typeUris.length === 0)) {
    return Query.select(Filter.nothing());
  }
  if (!typeUris) {
    return Query.select(searchFilter(trimmed));
  }
  return Query.select(Filter.and(searchFilter(trimmed), Filter.or(...typeUris.map((uri) => Filter.type(uri)))));
};

/**
 * Orders already-matched results for a query: exact label, then prefix, then substring, then shorter labels first.
 * The index does the matching; this only orders what it returned.
 */
export const byRelevance =
  (query: string) =>
  (a: { label?: string }, b: { label?: string }): number => {
    const trimmedQuery = query.trim();
    const needle = trimmedQuery.toLowerCase();
    const rank = (label?: string): number => {
      const value = (label ?? '').toLowerCase();
      if (value === needle) {
        return 0;
      }
      if (value.startsWith(needle)) {
        return 1;
      }
      if (value.includes(needle)) {
        return 2;
      }
      return 3;
    };
    const byRank = rank(a.label) - rank(b.label);
    if (byRank !== 0) {
      return byRank;
    }
    // Case-insensitive rank alone can tie two differently-cased matches (e.g. "al" vs "Al");
    // prefer the one that matches the query's exact case.
    const exactCase = (label?: string): number => ((label ?? '') === trimmedQuery ? 0 : 1);
    const byExactCase = exactCase(a.label) - exactCase(b.label);
    if (byExactCase !== 0) {
      return byExactCase;
    }
    return (a.label?.length ?? 0) - (b.label?.length ?? 0);
  };

/**
 * URIs of the user-facing types of `db`, for scoping a search to objects the app renders. Empty until the types
 * query resolves, which {@link searchQuery} treats as match-nothing rather than an unscoped search.
 */
export const useListedTypeUris = (db: Database.Database | undefined): URI.URI[] => {
  const types = useQuery(db, TypeOptions.allTypesQuery);
  return useMemo(() => {
    const uris = new Set<URI.URI>();
    for (const type of types) {
      if (TypeOptions.isUserType(type)) {
        uris.add(Type.getURI(type));
      }
    }
    return [...uris];
  }, [types]);
};

/** An option a search found, with the object it names. */
export type SearchOption = Option & { object: Obj.Unknown };

export type UseSearchProps = Pick<OptionsProps, 'filter'> & {
  /** The most options a search returns; unset returns every match. */
  limit?: number;
  /** Milliseconds a term waits for the next keystroke before it is searched. */
  delay?: number;
};

const DEFAULT_SEARCH_DELAY = 150;

const DRAIN_WAIT = 500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const drainSearchIndex = (db: Database.Database): Promise<void> =>
  db.flush({ secondaryIndexes: true }).catch((error) => log.warn('search index not drained', { error }));

/** Drains the full-text index as a search view opens, so its live query shows what was just written. */
export const useDrainedSearchIndex = (db: Database.Database | undefined): void => {
  useEffect(() => {
    if (db) {
      void drainSearchIndex(db);
    }
  }, [db]);
};

/**
 * Searches the listed objects of `db` as the reader types, for a menu that asks on every keystroke (an editor's
 * `getMenu`). A term is searched in the full-text index once typing pauses, its matches ordered by relevance; an
 * empty term lists every listed object by label. A call a later one supersedes resolves to `undefined`.
 */
export const useSearch = (
  db: Database.Database | undefined,
  { filter, limit, delay = DEFAULT_SEARCH_DELAY }: UseSearchProps = {},
): ((text: string) => Promise<SearchOption[] | undefined>) => {
  const { t } = Hooks.useTranslation();
  const typeUris = useListedTypeUris(db);
  const requestRef = useRef(0);
  const openDrainRef = useRef<{ db: Database.Database; done: Promise<void> }>(undefined);
  return useCallback(
    async (text: string) => {
      const request = ++requestRef.current;
      if (!db) {
        return [];
      }

      const term = text.trim();
      if (!term || openDrainRef.current?.db !== db) {
        openDrainRef.current = { db, done: drainSearchIndex(db) };
      }
      if (term) {
        await Promise.all([sleep(delay), Promise.race([openDrainRef.current.done, sleep(DRAIN_WAIT)])]);
        if (request !== requestRef.current) {
          return undefined;
        }
      }

      const objects = await db.query(term ? searchQuery(term, typeUris) : everything).run();
      if (request !== requestRef.current) {
        return undefined;
      }

      const options = listedOptions(objects, { t, filter }).toSorted(
        term ? byRelevance(term) : (left, right) => left.label.localeCompare(right.label),
      );
      return limit === undefined ? options : options.slice(0, limit);
    },
    [db, t, filter, typeUris, limit, delay],
  );
};

/** The listed objects of `db` as options; see {@link toOptions}. */
export const useOptions = (db: Database.Database | undefined, filter?: OptionsProps['filter']): Option[] => {
  const { t } = Hooks.useTranslation();
  const objects = useQuery(db, everything);
  return useMemo(() => toOptions(objects, { t, filter }), [objects, t, filter]);
};

export type RootProps = {
  db?: Database.Database;
  /** The selected object's URI. */
  value?: string;
  placeholder?: string;
  filter?: OptionsProps['filter'];
  /** Called with the picked object's URI, or `undefined` when the selected one is picked again. */
  onValueChange: (value: string | undefined) => void;
};

/**
 * Picks one object of the space: a button showing the selection opens a popup whose search field narrows the listed
 * objects, each with its type icon.
 */
export const Root = ({ db, value, placeholder, filter, onValueChange }: RootProps) => {
  const options = useOptions(db, filter);
  const items = useMemo<Combobox.Option[]>(
    () =>
      options.map(({ id, label, icon, iconHue }) => ({
        value: id,
        label,
        icon,
        iconHue: hues.find((hue) => hue === iconHue),
      })),
    [options],
  );
  return (
    <Combobox.Root
      items={items}
      value={value ? [value] : []}
      onSelect={({ itemValue }) => onValueChange(itemValue === value ? undefined : itemValue)}
    >
      <Combobox.Trigger placeholder={placeholder} />
      <Combobox.Content />
    </Combobox.Root>
  );
};
