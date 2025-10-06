//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { ElevationProvider, Icon } from '@dxos/react-ui';
import {
  type QueryItem,
  SearchBox,
  type SearchBoxController,
  type SearchBoxProps,
  itemIsTag,
  itemIsText,
} from '@dxos/react-ui-components';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';

import { InboxCapabilities } from '../../capabilities';
import { InboxAction, type Mailbox } from '../../types';

import { EmptyMailboxContent } from './EmptyMailboxContent';
import { type MailboxActionHandler, Mailbox as MailboxComponent } from './Mailbox';
import { useMailboxModel } from './model';
import { useMailboxToolbarActions, useTagFilterVisibility } from './toolbar';

export type MailboxContainerProps = {
  mailbox: Mailbox.Mailbox;
  role?: string;
};

export const MailboxContainer = ({ mailbox, role }: MailboxContainerProps) => {
  const id = fullyQualifiedId(mailbox);
  const state = useCapability(InboxCapabilities.MailboxState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const currentMessageId = state[id]?.id;

  const model = useMailboxModel(mailbox.queue.dxn);

  const queryEditorRef = useRef<SearchBoxController>(null);
  const { tagFilterState, tagFilterVisible, dispatch: filterDispatch } = useTagFilterVisibility();
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (tagFilterState === 'controlled' && queryEditorRef.current) {
      t = setTimeout(() => queryEditorRef.current?.focus());
    }
    return () => clearTimeout(t);
  }, [tagFilterState]);

  const setTagFilterVisible = useCallback(
    (visible: boolean) => {
      if (!visible) {
        model.clearSelectedTags();
        model.clearTextFilters();
      }
      filterDispatch('toggle_from_toolbar');
    },
    [model, filterDispatch],
  );

  const menu = useMailboxToolbarActions(mailbox, model, tagFilterVisible, setTagFilterVisible);

  const handleAction = useCallback<MailboxActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          const message = model.messages.find((message) => message.id === action.messageId);
          void dispatch(
            createIntent(InboxAction.SelectMessage, {
              mailboxId: id,
              message,
            }),
          );
          void dispatch(
            createIntent(DeckAction.ChangeCompanion, {
              primary: id,
              companion: `${id}${ATTENDABLE_PATH_SEPARATOR}message`,
            }),
          );
          break;
        }
        case 'select': {
          log.info('select', { messageId: action.messageId });
          break;
        }
        case 'select-tag': {
          log.info('select-tag', { label: action.label });
          filterDispatch('tag_selected_from_message');
          model.selectTag(action.label);
          break;
        }
      }
    },
    [id, dispatch, model.messages, model, filterDispatch],
  );

  const handleQueryEditorChange = useCallback(
    (items: QueryItem[]) => {
      // Clear existing filters
      model.clearSelectedTags();
      model.clearTextFilters();

      // Handle tag items
      const labels = items.filter(itemIsTag).map(({ label }) => label);
      labels.forEach((label) => model.selectTag(label));

      // Handle text items
      const textFilters = items
        .filter(itemIsText)
        .filter(({ content }) => /\w/.test(content))
        .map(({ content }) => content);
      model.setTextFilters(textFilters);

      if (labels.length === 0 && textFilters.length === 0) {
        filterDispatch('all_tags_cleared');
      }
    },
    [model, filterDispatch],
  );

  const handleSearch = useCallback<NonNullable<SearchBoxProps['onSearch']>>(
    (text, ids) =>
      model.availableTags
        .filter((tag) => tag.label.toLowerCase().includes(text.toLowerCase()))
        .filter((tag) => !ids.includes(tag.label))
        .map((tag) => ({ id: tag.label, label: tag.label, hue: tag.hue as any })),
    [model.availableTags],
  );

  const gridLayout = useMemo(
    () =>
      tagFilterVisible.value
        ? 'grid grid-rows-[var(--toolbar-size)_min-content_1fr]'
        : 'grid grid-rows-[var(--toolbar-size)_1fr]',
    [tagFilterVisible.value],
  );

  return (
    <StackItem.Content classNames={['relative', gridLayout]} layoutManaged toolbar>
      <ElevationProvider elevation='positioned'>
        <MenuProvider {...menu} attendableId={id}>
          <ToolbarMenu />
        </MenuProvider>
      </ElevationProvider>

      {tagFilterVisible.value && (
        <div role='none' className='pli-1 pbs-[1px] border-be bs-8 flex items-center border-separator'>
          <Icon role='presentation' icon='ph--tag--bold' classNames='mr-1 opacity-30' aria-label='tags icon' size={4} />
          <SearchBox ref={queryEditorRef} onSearch={handleSearch} onChange={handleQueryEditorChange} />
        </div>
      )}

      {model.messages && model.messages.length > 0 ? (
        <MailboxComponent
          messages={model.messages}
          id={id}
          onAction={handleAction}
          currentMessageId={currentMessageId}
          role={role}
        />
      ) : (
        <EmptyMailboxContent mailbox={mailbox} />
      )}
    </StackItem.Content>
  );
};
