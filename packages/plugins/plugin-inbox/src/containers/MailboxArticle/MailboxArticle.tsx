//
// Copyright 2025 DXOS.org
//

import { useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import React from 'react';

import { type AppSurface, ProgressMeter } from '@dxos/app-toolkit/ui';
import { useActionRunner } from '@dxos/plugin-graph/hooks';
import { ElevationProvider, Panel } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { Menu, useMenuActions } from '@dxos/react-ui-menu';

import { InboxStack, Show } from '#components';
import { type Mailbox, type SystemTags } from '#types';

import { InitializeMailbox } from './InitializeMailbox';
import { type MailboxController } from './mailbox-controller';
import { MailboxFilter } from './MailboxFilter';
import { useMailboxController } from './useMailboxController';

export type MailboxArticleProps = AppSurface.ObjectArticleProps<
  Mailbox.Mailbox,
  {
    filter?: string;
    /**
     * Canonical system tag (Inbox/Sent/Draft) this view resolves by id, not by parsing `filter` as tag
     * text — stays correct regardless of label/provider. `filter` seeds the editable box; once edited
     * away from that seed, normal text/tag parsing takes over (Drafts hides the box — see
     * `MailboxController.hideFilterEditor`).
     */
    systemTag?: SystemTags.SystemTagId;
  }
>;

/**
 * Pure template over {@link useMailboxController} (experiment: see the declarative-ui-abstraction
 * spec): all state is controller atoms, all interaction funnels through `dispatch`, and the only
 * conditional rendering is declarative (`Show`). The filter box is handed to the menu model as a
 * named slot; DOM anchors (popover anchor, editor focus) register through `controller.anchors`.
 */
export const MailboxArticle = ({
  subject: mailbox,
  filter: filterProp,
  systemTag,
  attendableId,
}: MailboxArticleProps) => {
  const controller = useMailboxController({ mailbox, systemTag, filterProp, attendableId });
  // Filled during render (idempotent write, read lazily by the menu's slot action) so the slot
  // component can close over the controller without a circular construction dependency.
  controller.slots.filter = () => <MailboxFilterSlot controller={controller} />;
  const menu = useMenuActions(controller.menu);
  const runAction = useActionRunner();

  return (
    <Panel.Root data-testid='inbox.mailbox'>
      <ElevationProvider elevation='positioned'>
        <Menu.Root {...menu} onAction={runAction} attendableId={controller.contextId}>
          <Panel.Toolbar asChild>
            <Menu.Toolbar />
          </Panel.Toolbar>
        </Menu.Root>
      </ElevationProvider>
      <Show
        when={controller.state.showEmptyState}
        fallback={
          <Panel.Content asChild>
            <MailboxStack controller={controller} />
          </Panel.Content>
        }
      >
        <Panel.Content asChild>
          <InitializeMailbox mailbox={mailbox} />
        </Panel.Content>
      </Show>
      <Show when={controller.state.progress}>
        {(progress) => (
          <Panel.Statusbar asChild>
            <ProgressMeter
              state={progress}
              classNames='border-t border-separator'
              onCancel={controller.canCancelSync ? () => controller.dispatch({ type: 'cancel-sync' }) : undefined}
            />
          </Panel.Statusbar>
        )}
      </Show>
    </Panel.Root>
  );
};

MailboxArticle.displayName = 'MailboxArticle';

/**
 * The message stack with its atom subscriptions (items, pagination, selection) scoped below the
 * article, so a page load or selection change never re-renders the chrome above.
 */
const MailboxStack = composable<HTMLDivElement, { controller: MailboxController }>(
  ({ controller, ...props }, forwardedRef) => {
    const { state, dispatch } = controller;
    const items = useAtomValue(state.items);
    const messages = useAtomValue(state.messages);
    const pagination = useAtomValue(state.pagination);
    const loading = useAtomValue(state.loading);
    const searchQuery = useAtomValue(state.searchQuery);
    const currentId = useSelection(controller.contextId, 'single');
    useArticleKeyboardNavigation({
      articleId: controller.contextId,
      items: messages,
      currentId,
      onSelect: (messageId) => dispatch({ type: 'navigate', messageId }),
    });

    return (
      // Always keep the list mounted (even with no items yet); `loading` renders an in-flow
      // spinner at the end of the list rather than replacing the whole panel — so a page fetch
      // or a mid-sync refresh never blanks what's already shown.
      <InboxStack
        {...composableProps(props)}
        ref={forwardedRef}
        id={controller.contextId}
        items={items}
        currentId={currentId}
        tagsAtom={state.tags}
        starredAtom={state.starred}
        pagination={pagination}
        loading={loading}
        enableIgnoreSender
        enableCreateTopic
        searchQuery={searchQuery}
        onAction={dispatch}
      />
    );
  },
);

MailboxStack.displayName = 'MailboxStack';

/**
 * The search box, slotted into the toolbar by the menu model (`slots.filter`). Subscribes to the
 * filter atoms itself so the slot's render closure stays stable — the menu atom no longer rebuilds
 * per keystroke the way the memoized `filterElement` dependency used to force.
 */
const MailboxFilterSlot = ({ controller }: { controller: MailboxController }) => {
  const { state, dispatch, anchors } = controller;
  const value = useAtomValue(state.filterText);
  const setFilterText = useAtomSet(state.filterText);
  const filter = useAtomValue(state.filter);
  const tags = useAtomValue(state.tagMap);

  return (
    <MailboxFilter
      db={controller.db}
      tags={tags}
      value={value}
      filter={filter}
      onChange={setFilterText}
      onSave={() => dispatch({ type: 'save-filter' })}
      onClear={() => dispatch({ type: 'clear-filter' })}
      editorRef={(editor) => {
        anchors.filterEditor = editor;
      }}
      saveButtonRef={(button) => {
        anchors.saveButton = button;
      }}
    />
  );
};

MailboxFilterSlot.displayName = 'MailboxFilterSlot';
