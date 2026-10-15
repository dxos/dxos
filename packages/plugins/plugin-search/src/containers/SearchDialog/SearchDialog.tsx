//
// Copyright 2024 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import { Entity, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { SearchList, type SearchResult } from '@dxos/react-ui-search';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';

import { buildSearchQuery, toSearchResults, useGlobalSearch, useSearchableTypeUris } from '#hooks';
import { meta } from '#meta';
import { SearchCapabilities, SearchEvents } from '#types';

export type SearchDialogProps = AppSurface.SpaceArticleProps<{
  pivotId?: string;
}>;

export const SearchDialog = ({ space, pivotId: pivotIdProp }: SearchDialogProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invoke, invokePromise } = Hooks.useOperationInvoker();
  Hooks.useActivationSignal(SearchEvents.Start);
  const queryActions = Hooks.useCapabilities(SearchCapabilities.QueryAction);
  const { setMatch } = useGlobalSearch();
  const layout = ToolkitHooks.useLayout();
  const pivotId = pivotIdProp ?? layout.active[layout.active.length - 1];
  const [query, setQuery] = useState<string>();

  // Scope the FTS query to user-facing types so results match what the app can render.
  const typeUris = useSearchableTypeUris(space);
  const objects = useQuery(space?.db, buildSearchQuery(query, typeUris));
  const results = useMemo(() => (query ? toSearchResults(objects, query) : []), [objects, query]);
  const allResults = useMemo(() => results.filter(({ object }) => object && Entity.getLabel(object)), [results]);

  // Asked on every keystroke, which is why `match` must answer from the text alone.
  const actionItems = useMemo(() => {
    const text = query?.trim();
    if (!text || !space) {
      return [];
    }
    return queryActions.flat().flatMap((action) => {
      const item = action.match(text);
      return item ? [{ action, item }] : [];
    });
  }, [queryActions, query, space]);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      setMatch?.(text);
    },
    [setMatch],
  );

  const handleSelect = useCallback(
    async (result: SearchResult) => {
      if (!result.object || !Obj.isObject(result.object)) {
        return;
      }

      const qualifiedPath = GraphPath.getObjectPathFromObject(result.object);
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      await invokePromise(LayoutOperation.Open, {
        subject: [qualifiedPath],
        pivotId,
        disposition: 'add',
      });
    },
    [pivotId, invokePromise],
  );

  const handleAction = useCallback(
    (action: SearchCapabilities.QueryAction, text: string) => {
      if (!space) {
        return;
      }

      const program = Effect.gen(function* () {
        yield* invoke(LayoutOperation.UpdateDialog, { state: false });
        const object = yield* action.run(text, { db: space.db });
        if (!object) {
          return;
        }

        // Where a just-stored object lands in the tree is the resolver's question.
        const { targets } = yield* invoke(NavigationOperation.ResolveNavigationTargets, {
          query: { uri: Obj.getURI(object) },
        });
        const path = targets[0]?.path ?? GraphPath.getObjectPathFromObject(object);
        yield* invoke(LayoutOperation.Open, { subject: [path], pivotId, disposition: 'add', navigation: 'immediate' });
        yield* invoke(LayoutOperation.Expose, { subject: path });
      }).pipe(
        // Handlers die rather than fail on most errors, so the whole cause is caught to reach the toast.
        Effect.catchCause((cause) =>
          Effect.gen(function* () {
            const error = Cause.squash(cause);
            log.warn('search query action failed', { action: action.id, err: error });
            yield* invoke(LayoutOperation.AddToast, {
              id: `${meta.profile.key}.query-action`,
              icon: 'ph--warning--regular',
              title: ['query-action-failed.title', { ns: meta.profile.key }],
              description: error instanceof Error ? error.message : String(error),
            });
          }).pipe(Effect.ignore),
        ),
      );

      void EffectEx.runPromise(program);
    },
    [space, invoke, pivotId],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('search-dialog.title')}</Dialog.Title>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <SearchList.Root onSearch={handleSearch} resetSelectionOnChange>
          <SearchList.Input
            classNames='px-0'
            autoFocus
            escapeBehavior='dismiss'
            placeholder={t('search.placeholder')}
            {...{ [Dialog.DIALOG_AUTOFOCUS_ATTRIBUTE]: '' }}
          />
          <SearchList.Viewport classNames='max-h-[24rem]'>
            {actionItems.map(({ action, item }) => (
              <SearchList.Item
                key={action.id}
                icon={item.icon}
                value={action.id}
                label={t(...item.label)}
                onSelect={() => handleAction(action, query ?? '')}
              />
            ))}
            {query && actionItems.length === 0 && allResults.length === 0 && <SearchList.Empty />}
            {allResults.map((result) => (
              <SearchList.Item
                key={result.id}
                icon={result.icon}
                value={result.id}
                label={result.label ?? (result.object ? Entity.getLabel(result.object) : undefined) ?? result.id}
                onSelect={() => void handleSelect(result)}
              />
            ))}
          </SearchList.Viewport>
        </SearchList.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};

SearchDialog.displayName = 'SearchDialog';
