//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { ElevationProvider, Icon } from '@dxos/react-ui';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { QueryEditor } from '@dxos/react-ui-query-editor';
import { StackItem } from '@dxos/react-ui-stack';

import { InboxCapabilities } from '../../capabilities';
import { InboxAction, type Mailbox } from '../../types';

import { EmptyMailboxContent } from './EmptyMailboxContent';
import { type MailboxActionHandler, Mailbox as MailboxComponent } from './Mailbox';
import { useMailboxModel } from './model';
import { useMailboxToolbarActions, useQueryEditorFocusRef, useTagFilterVisibility } from './toolbar';

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
  // Use the new hook for tag filter visibility management
  const { tagFilterState, tagFilterVisible, dispatch: filterDispatch } = useTagFilterVisibility();

  const setTagFilterVisible = useCallback(
    (visible: boolean) => {
      if (!visible) {
        model.clearSelectedTags();
      }
      filterDispatch('toggle_from_toolbar');
    },
    [model, filterDispatch],
  );
  const menu = useMailboxToolbarActions(mailbox, model, tagFilterVisible, setTagFilterVisible);

  const queryEditorFocusRef = useQueryEditorFocusRef(tagFilterState);

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

  const onQueryEditorUpdate = useCallback(
    (ids: string[]) => {
      model.clearSelectedTags();
      for (const id of ids) {
        model.selectTag(id);
      }

      if (ids.length === 0) {
        filterDispatch('all_tags_cleared');
      }
    },
    [model, filterDispatch],
  );

  const queryEditorCurrentItems = useMemo(() => {
    return model.selectedTags.map((tag) => ({ ...tag, id: tag.label, hue: tag.hue }) as any);
  }, [model.selectedTags]);

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
          <QueryEditor
            ref={queryEditorFocusRef}
            items={queryEditorCurrentItems}
            onUpdate={onQueryEditorUpdate}
            onSearch={(text, ids) =>
              model.availableTags
                .filter((tag) => tag.label.toLowerCase().includes(text.toLowerCase()))
                .filter((tag) => !ids.includes(tag.label))
                .map((tag) => ({ id: tag.label, label: tag.label, hue: tag.hue as any }))
            }
          />
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
