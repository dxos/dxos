//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type PropsWithChildren } from 'react';

import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type ActionGraphProps, Menu, useMenuActions } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type ChatEvent } from '../Chat/events.ts';

/**
 * 44px at the 16px (pointer: fine) root font-size, the iOS HIG minimum touch target; the density
 * knobs cap a control at 40px, so a finger-driven control has to be sized past them. Applied only
 * where a finger is plausibly the pointer, so the desktop row keeps its density rhythm.
 */
const TOUCH_TARGET = 'max-md:size-11 pointer-coarse:size-11';

export type ChatActionsProps = ThemedClassName<
  PropsWithChildren<{
    /** The prompt's graph node, which is what contributed actions are filed under. */
    attendableId?: string;
    /**
     * Toolbar actions other plugins filed on this chat's node — the microphone among them. Sourced
     * the way `MarkdownArticle` sources its own, so a contributor reaches the prompt without either
     * side importing the other.
     */
    customActions?: Atom.Atom<ActionGraphProps>;
    processing?: boolean;
    debug?: boolean;
    /** Submits the current prompt; the send control renders only when provided. */
    onSend?: () => void;
    /** Whether the prompt holds text and the processor would accept it; drives the send control's enablement. */
    canSend?: boolean;
    /** Whether the checklist beside the prompt is shown; the toggle renders only when provided. */
    tasksVisible?: boolean;
    onEvent?: (event: ChatEvent) => void;
  }>
>;

export const ChatActions = ({
  classNames,
  children,
  attendableId,
  customActions,
  processing,
  debug,
  onSend,
  canSend,
  tasksVisible,
  onEvent,
}: ChatActionsProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <div className={mx('flex items-center gap-1', classNames)}>
      {children}
      {customActions && <ContributedActions actions={customActions} attendableId={attendableId} />}
      {debug && (
        <IconButton
          variant='ghost'
          icon='ph--wrench--regular'
          iconOnly
          label={t('debug.button')}
          onClick={() => onEvent?.({ type: 'toggle-debug' })}
        />
      )}

      {tasksVisible !== undefined && (
        <IconButton
          variant='ghost'
          classNames={TOUCH_TARGET}
          icon='ph--list-checks--regular'
          iconOnly
          // The state, not a colour: `aria-pressed` tells assistive tech what this is, and the
          // theme already dresses a pressed ghost button (`button.css`). Applying an accent here
          // too would only fight it.
          aria-pressed={tasksVisible}
          label={t(tasksVisible ? 'hide-tasks.button' : 'show-tasks.button')}
          data-testid='assistant.toggle-tasks'
          onClick={() => onEvent?.({ type: 'toggle-tasks' })}
        />
      )}
      {/* One control, not two: send and stop are the same affordance at two moments of a turn, and
          as separate buttons one of them was always present and dead. Enter is the only other way to
          submit, and a touch keyboard offers no such affordance. */}
      {onSend && (
        // TODO(dmaretskyi): Set processing state correctly on rehydrated agents.
        <IconButton
          disabled={!processing && !canSend}
          variant='ghost'
          classNames={mx(TOUCH_TARGET, processing ? 'text-error-text' : canSend && 'text-accent-text')}
          icon={processing ? 'ph--square--duotone' : 'ph--paper-plane-right--regular'}
          iconOnly
          label={t(processing ? 'cancel-processing.button' : 'send.label')}
          // One stable handle for the prompt's primary action; its mode is the accessible label,
          // which is also how a reader tells the two apart.
          data-testid='assistant.send'
          onClick={() => (processing ? onEvent?.({ type: 'cancel' }) : onSend())}
        />
      )}
    </div>
  );
};

/**
 * The contributed actions, rendered through the menu's own item dispatch rather than a local copy
 * of it — that is what makes a `variant: 'custom'` contribution (the mic's press-and-hold and its
 * options menu) render here exactly as it does in a document toolbar.
 *
 * Its own component so the hook is unconditional; the row renders it only when a caller supplies
 * actions.
 */
const ContributedActions = ({
  actions,
  attendableId,
}: {
  actions: Atom.Atom<ActionGraphProps>;
  attendableId?: string;
}) => {
  const menuActions = useMenuActions(actions);
  return (
    <Menu.Root {...menuActions} attendableId={attendableId} alwaysActive>
      {/* Plain (non-`custom`) items render `Toolbar.*` primitives, which throw without the roving-focus
          context `Menu.Toolbar` provides; `contents` keeps the items in the prompt's own row. */}
      <Menu.Toolbar classNames='contents'>
        <Menu.Items />
      </Menu.Toolbar>
    </Menu.Root>
  );
};
