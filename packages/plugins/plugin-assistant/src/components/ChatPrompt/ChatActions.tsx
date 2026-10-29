//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';
import React, { type ReactNode } from 'react';

import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { AssistantNamespace } from '../../namespace.ts';
import { type ChatDrawer, type ChatEvent } from '../Chat/events.ts';

/**
 * 44px at the 16px (pointer: fine) root font-size, the iOS HIG minimum touch target; the density
 * knobs cap a control at 40px, so a finger-driven control has to be sized past them. Applied only
 * where a finger is plausibly the pointer, so the desktop row keeps its density rhythm.
 */
const TOUCH_TARGET = 'max-md:size-11 pointer-coarse:size-11';

export type ChatActionsProps = Util.ThemedClassName<{
  /** Content before the actions in the same toolbar (the prompt's options and context chips). */
  leading?: ReactNode;
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
  /** Whether the prompt holds text and the chat model would accept it; drives the send control's enablement. */
  canSend?: boolean;
  drawers?: { available: readonly ChatDrawer[]; open?: ChatDrawer };
  /** Submits the current prompt; the send control renders only when provided. */
  onSend?: () => void;
  onEvent?: (event: ChatEvent) => void;
}>;

export const ChatActions = ({
  classNames,
  leading,
  attendableId,
  customActions,
  processing,
  debug,
  canSend,
  drawers,
  onSend,
  onEvent,
}: ChatActionsProps) => {
  const { t } = Hooks.useTranslation(AssistantNamespace.key);
  // While a turn runs the primary control interrupts it — unless there is text waiting, in which
  // case sending it (which queues it behind the running turn) is what the reader is asking for.
  const showStop = processing && !canSend;
  const controls = (
    <>
      {debug && (
        <Button.Root
          variant='ghost'
          icon='ph--wrench--regular'
          iconOnly
          label={t('debug.button')}
          onClick={() => onEvent?.({ type: 'toggle-debug' })}
        />
      )}

      {/* One control, not two: send and stop are the same affordance at two moments of a turn, and
          as separate buttons one of them was always present and dead. Enter is the only other way to
          submit, and a touch keyboard offers no such affordance. */}
      {onSend && (
        // TODO(dmaretskyi): Set processing state correctly on rehydrated agents.
        <Button.Root
          disabled={!showStop && !canSend}
          variant='ghost'
          classNames={mx(TOUCH_TARGET, 'transition duration-300 ease-in-out', canSend && 'text-accent-text rotate-90')}
          icon={showStop ? 'ph--stop-circle--duotone' : 'ph--paper-plane--regular'}
          iconOnly
          label={t(showStop ? 'cancel-processing.button' : 'send.label')}
          onClick={() => (showStop ? onEvent?.({ type: 'cancel' }) : onSend())}
          // One stable handle for the prompt's primary action; its mode is the accessible label,
          // which is also how a reader tells the two apart.
          data-testid='assistant.send'
        />
      )}
    </>
  );

  const start = (
    <>
      {leading}
      {drawers && drawers.available.length > 0 && <DrawerToggles {...drawers} onEvent={onEvent} />}
    </>
  );

  // One toolbar for the whole row, so the contributed actions and the prompt's own controls share its roving focus; the
  // contributions render through the menu's own item dispatch, so a `custom` one (the mic) renders as in a document.
  const menuActions = useMenuBuilder(
    (get) =>
      MenuBuilder.make()
        .custom('prompt-options', { label: ['prompt-options.label', { ns: AssistantNamespace.key }] }, () => start)
        .subgraph(customActions && get(customActions))
        .custom('prompt-controls', { label: ['prompt-controls.label', { ns: AssistantNamespace.key }] }, () => controls)
        .build(),
    [start, controls, customActions],
  );

  return <ActionToolbar {...menuActions} attendableId={attendableId} alwaysActive classNames={classNames} />;
};

const DRAWER_ICONS: Record<ChatDrawer, string> = {
  context: 'px--context-panel--regular',
  tasks: 'ph--list-checks--regular',
};

const DrawerToggles = ({
  available,
  open,
  onEvent,
}: NonNullable<ChatActionsProps['drawers']> & Pick<ChatActionsProps, 'onEvent'>) => {
  const { t } = Hooks.useTranslation(AssistantNamespace.key);
  return (
    <Toolbar.ToggleGroup
      type='multiple'
      value={open ? [open] : []}
      onValueChange={(value) =>
        onEvent?.({ type: 'set-drawer', drawer: available.find((drawer) => drawer !== open && value.includes(drawer)) })
      }
    >
      {available.map((drawer) => (
        <ToggleGroup.Item
          key={drawer}
          value={drawer}
          classNames={TOUCH_TARGET}
          icon={DRAWER_ICONS[drawer]}
          iconOnly
          label={t(`${drawer}-drawer.label`)}
          data-testid={`assistant.toggle-${drawer}`}
        />
      ))}
    </Toolbar.ToggleGroup>
  );
};
