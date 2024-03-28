//
// Copyright 2024 DXOS.org
//

import { composeEventHandlers } from '@radix-ui/primitive';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { type Scope } from '@radix-ui/react-context';
import * as MenuPrimitive from '@radix-ui/react-menu';
import React, { forwardRef } from 'react';

import {
  Button,
  type ButtonProps,
  useDropdownMenuContext,
  useDropdownMenuMenuScope,
  useTranslation,
} from '@dxos/react-ui';

import { PlankHeading } from './PlankHeading';
import { translationKey } from '../../translations';

const TRIGGER_NAME = 'DropDownMenuDragHandleTrigger';

type ScopedProps<P> = P & { __scopeDropdownMenu?: Scope };

export type DropDownMenuDragHandleTriggerProps = ButtonProps & { active?: boolean };

/**
 * # NOTE(thure)
 *
 * ## Dependencies
 * This component relies on a patch of @radix-ui/dropdown-menu which exports `useDropdownMenuContext` and
 * exports its `useMenuScope` as `useDropdownMenuMenuScope`.
 *
 * ## Purpose
 * This component implements an equivalent dropdown menu trigger can be with different event bindings that allow pointer
 * inputs to both open the associated menu and start dragging the associated item.
 *
 * ## Keyboard access
 * In order not to break keyboard access, which relies on Space and Enter keys activating buttons the same way, an
 * additional button is added behind the pointer button which acts solely as the drag handle for keyboard inputs.
 */
export const DropDownMenuDragHandleTrigger = forwardRef<HTMLButtonElement, DropDownMenuDragHandleTriggerProps>(
  (props: ScopedProps<DropDownMenuDragHandleTriggerProps>, forwardedRef) => {
    const { __scopeDropdownMenu, disabled = false, active, onKeyDown, ...triggerProps } = props;
    const context = useDropdownMenuContext(TRIGGER_NAME, __scopeDropdownMenu);
    const menuScope = useDropdownMenuMenuScope(__scopeDropdownMenu);
    const { t } = useTranslation(translationKey);
    return (
      <div role='none' className='inline-grid relative'>
        <MenuPrimitive.Anchor asChild {...menuScope}>
          {/* See §“Purpose” */}
          <PlankHeading.Button
            id={context.triggerId}
            aria-haspopup='menu'
            aria-expanded={context.open}
            aria-controls={context.open ? context.contentId : undefined}
            data-state={context.open ? 'open' : 'closed'}
            data-disabled={disabled ? '' : undefined}
            disabled={disabled}
            data-testid='section.drag-handle-menu-trigger'
            {...triggerProps}
            ref={composeRefs(forwardedRef, context.triggerRef)}
            onPointerUp={composeEventHandlers(props.onPointerUp, (event) => {
              // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
              // but not when the control key is pressed (avoiding MacOS right click)
              if (!disabled && !active && event.button === 0 && event.ctrlKey === false) {
                context.onOpenToggle();
                // prevent trigger focusing when opening
                // this allows the content to be given focus without competition
                if (!context.open) {
                  event.preventDefault();
                }
              }
            })}
            onKeyDown={(event) => {
              if (disabled) {
                return;
              }
              if (['Enter', ' '].includes(event.key)) {
                context.onOpenToggle();
              }
              if (event.key === 'ArrowDown') {
                context.onOpenChange(true);
              }
              // prevent keydown from scrolling window / first focused item to execute
              // that keydown (inadvertently closing the menu)
              if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
                event.preventDefault();
              }
            }}
          />
        </MenuPrimitive.Anchor>
        {/* See §“Keyboard access” */}
        <Button
          variant='ghost'
          classNames='absolute block-end-0 inset-inline-0 min-bs-0 bs-4 z-[-1]'
          onKeyDown={onKeyDown}
        >
          <span className='sr-only'>{t('drag handle label')}</span>
        </Button>
      </div>
    );
  },
);
