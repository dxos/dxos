//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Database, Filter, Obj, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useQuery } from '@dxos/echo-react';
import { type EntityId } from '@dxos/keys';
import { type EditorController } from '@dxos/react-ui-editor';
import { TagIndex } from '@dxos/schema';

import { QueryFilter } from '#components';
import { type Calendar, type Mailbox } from '#types';

import { POPOVER_SAVE_FILTER } from '../constants.ts';
import { getFilterTagUris } from '../util/index.ts';
import { useDebouncedValue } from './useDebouncedValue.ts';

/** Debounce applied to the filter text before it reaches the query. */
const FILTER_DEBOUNCE_MS = 300;

export type QueryFilterOwner = Mailbox.Mailbox | Calendar.Calendar;

export type UseQueryFilterProps = {
  /** Object the filter is saved onto (its `filters` list backs the saved-view nodes in the navtree). */
  owner: QueryFilterOwner;
  tags: Tag.Map;
  /** Seed text; also what Clear restores. */
  initialText?: string;
};

/**
 * Filter-box state shared by the mailbox and calendar toolbars: the editor text, its parse, debounced
 * copies for the query, and the rendered {@link QueryFilter} row whose Save opens the save-filter popover.
 */
export const useQueryFilter = ({ owner, tags, initialText = '' }: UseQueryFilterProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(owner);
  const editorRef = useRef<EditorController>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const builder = useMemo(() => new QueryBuilder(tags), [tags]);
  const [text, setText] = useState<string>(initialText);
  // Supplied by the query editor, which already parses the DSL to decorate it - deriving the filter
  // here as well parsed every keystroke twice. `builder` remains for programmatic text, which raises
  // no editor event.
  const [filter, setFilter] = useState<Filter.Any | undefined>(() => builder.build(initialText).filter);

  // The query is driven by a DEBOUNCED value so typing doesn't rebuild the query (and flash the list
  // empty) on every keystroke; `useDeferredValue` still commits each intermediate keystroke.
  const debouncedText = useDebouncedValue(text, FILTER_DEBOUNCE_MS);
  const debouncedFilter = useMemo(() => builder.build(debouncedText).filter, [debouncedText, builder]);

  // Text set from here reaches the editor imperatively - a controlled `value` would race fast typing -
  // and raises no editor event, so the parse (which gates Save) is redone here too.
  const applyText = useCallback(
    (next: string) => {
      setText(next);
      setFilter(builder.build(next).filter);
      editorRef.current?.setText(next);
    },
    [builder],
  );

  // Read by handlers that append to the current text and must not be rebuilt on every keystroke.
  const textRef = useRef(text);
  textRef.current = text;

  const handleClear = useCallback(() => applyText(initialText), [initialText, applyText]);

  const handleSave = useCallback(() => {
    if (filter) {
      void invokePromise(LayoutOperation.UpdatePopover, {
        subject: POPOVER_SAVE_FILTER,
        state: true,
        variant: 'virtual',
        anchor: saveButtonRef.current,
        props: { owner, filter: text },
      });
    }
  }, [owner, filter, text, invokePromise]);

  // Memoized so its reference (a menu-builder dep) only changes when the filter props do.
  const element = useMemo(
    () => (
      <QueryFilter
        db={db}
        tags={tags}
        value={text}
        filter={filter}
        onChange={setText}
        onFilterChange={setFilter}
        onSave={handleSave}
        onClear={handleClear}
        editorRef={editorRef}
        saveButtonRef={saveButtonRef}
      />
    ),
    [db, tags, text, filter, handleSave, handleClear],
  );

  return { text, textRef, filter, debouncedText, debouncedFilter, applyText, editorRef, element };
};

const EMPTY_TAG_IDS_ATOM = Atom.make((): readonly (readonly [string, readonly EntityId[]])[] => []);

/**
 * Resolves a filter's root tag terms to member ids from `tagIndex`, read reactively so a search scoped
 * to a tag's members re-runs when that tag's membership changes - feed objects carry no `meta.tags`.
 */
export const useFilterTagIds = (tagIndex: TagIndex.TagIndex | undefined, filter: Filter.Any | undefined) => {
  const tagUris = useMemo(() => getFilterTagUris(filter), [filter]);
  const tagUrisKey = tagUris.join(',');
  const atom = useMemo(
    () =>
      tagIndex && tagUris.length > 0
        ? Atom.make((get) => tagUris.map((tagUri) => [tagUri, get(TagIndex.taggedIdsAtom(tagIndex, tagUri))] as const))
        : EMPTY_TAG_IDS_ATOM,
    // tagUris is a fresh array each render; key on its membership (tagUrisKey) instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tagIndex, tagUrisKey],
  );
  const tagIds = useAtomValue(atom);
  return useCallback((tagUri: string) => tagIds.find(([uri]) => uri === tagUri)?.[1], [tagIds]);
};

/** Tag registry keyed by the Tag object's URI - the id space of `meta.tags`, a `TagIndex`, and the QueryBuilder's tag terms. */
export const useTagMap = (db: Database.Database | undefined): Tag.Map => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  return useMemo(
    () =>
      tags.reduce<Tag.Map>((acc, tag) => {
        acc[Obj.getURI(tag).toString()] = tag;
        return acc;
      }, {}),
    [tags],
  );
};
