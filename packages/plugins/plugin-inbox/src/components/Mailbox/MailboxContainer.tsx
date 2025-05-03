//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { ElevationProvider, Icon } from '@dxos/react-ui';
import { stackItemContentToolbarClassNames } from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { TagPicker, type TagPickerHandle } from '@dxos/react-ui-tag-picker';

import { EmptyMailboxContent } from './EmptyMailboxContent';
import { Mailbox, type MailboxActionHandler } from './Mailbox';
import { useMailboxModel } from './model';
import { useMailboxToolbarAction, useMailboxToolbarActions } from './toolbar';
import { InboxCapabilities } from '../../capabilities/capabilities';
import { InboxAction, type MailboxType } from '../../types';

export type MailboxContainerProps = {
  mailbox: MailboxType;
};

export const MailboxContainer = ({ mailbox }: MailboxContainerProps) => {
  const id = fullyQualifiedId(mailbox);
  const state = useCapability(InboxCapabilities.MailboxState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const currentMessageId = state[id]?.id;

  const model = useMailboxModel(mailbox.queue.dxn);

  const [filterVisible, setFilterVisible] = useState(false);

  const toolbarState = useMemo(() => ({ filterVisible, setFilterVisible }), [filterVisible]);
  const menu = useMailboxToolbarActions(model, toolbarState);
  const handleToolbarAction = useMailboxToolbarAction({ model, state: toolbarState });

  const tagPickerRef = useRef<TagPickerHandle>(null);

  useEffect(() => {
    if (filterVisible && tagPickerRef.current) {
      // Wait a tiny bit for the DOM to update
      setTimeout(() => {
        tagPickerRef.current?.focus();
      }, 0);
    }
  }, [filterVisible]);

  const handleAction = useCallback<MailboxActionHandler>(
    ({ action, messageId }) => {
      switch (action) {
        case 'select': {
          log.debug(`[select message] ${messageId}`);
          break;
        }
        case 'current': {
          const message = model.messages.find((message) => message.id === messageId);
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
      }
    },
    [id, dispatch, model.messages],
  );

  const onTagPickerUpdate = useCallback(
    (ids: string[]) => {
      model.clearSelectedTags();
      for (const id of ids) {
        model.selectTag(id);
      }
    },
    [model],
  );

  const tagPickerCurrentItems = useMemo(() => {
    return model.selectedTags.map((tag) => ({ ...tag, id: tag.label, hue: tag.hue }) as any);
  }, [model.selectedTags]);

  return (
    <StackItem.Content classNames='relative'>
      <div role='none' className='grid grid-rows-[min-content_min-content_1fr]'>
        <div role='none' className={stackItemContentToolbarClassNames('section')}>
          <ElevationProvider elevation='positioned'>
            <MenuProvider {...menu} onAction={handleToolbarAction} attendableId={id}>
              <ToolbarMenu />
            </MenuProvider>
          </ElevationProvider>
        </div>

        {filterVisible && (
          <div role='none' className='pli-1 pbs-[1px] border-be bs-8 flex items-center border-separator'>
            <Icon
              role='presentation'
              icon='ph--tag--bold'
              classNames='mr-1 opacity-30'
              aria-label='tags icon'
              size={4}
            />
            <TagPicker
              ref={tagPickerRef}
              items={tagPickerCurrentItems}
              onUpdate={onTagPickerUpdate}
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
          <Mailbox
            messages={model.messages}
            id={id}
            name={mailbox.name}
            onAction={handleAction}
            currentMessageId={currentMessageId}
            onTagSelect={model.selectTag}
          />
        ) : (
          <EmptyMailboxContent mailbox={mailbox} />
        )}
      </div>
    </StackItem.Content>
  );
};
