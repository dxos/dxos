//
// Copyright 2024 DXOS.org
//

import { composeEventHandlers } from '@radix-ui/primitive';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { type Scope } from '@radix-ui/react-context';
import * as MenuPrimitive from '@radix-ui/react-menu';
import React, { forwardRef } from 'react';

import { Button, type ButtonProps, useDropdownMenuContext, useDropdownMenuMenuScope } from '@dxos/react-ui';

const TRIGGER_NAME = 'DropDownMenuDragHandleTrigger';

type ScopedProps<P> = P & { __scopeDropdownMenu?: Scope };

export type DropDownMenuDragHandleTriggerProps = ButtonProps & { active?: boolean };

export const DropDownMenuDragHandleTrigger = forwardRef<HTMLButtonElement, DropDownMenuDragHandleTriggerProps>(
  (props: ScopedProps<DropDownMenuDragHandleTriggerProps>, forwardedRef) => {
    const { __scopeDropdownMenu, disabled = false, active, ...triggerProps } = props;
    const context = useDropdownMenuContext(TRIGGER_NAME, __scopeDropdownMenu);
    const menuScope = useDropdownMenuMenuScope(__scopeDropdownMenu);
    return (
      <MenuPrimitive.Anchor asChild {...menuScope}>
        <Button
          id={context.triggerId}
          aria-haspopup='menu'
          aria-expanded={context.open}
          aria-controls={context.open ? context.contentId : undefined}
          data-state={context.open ? 'open' : 'closed'}
          data-disabled={disabled ? '' : undefined}
          disabled={disabled}
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
            if (active || disabled) {
              return;
            }
            if (event.key === 'Enter') {
              // prevent keydown from scrolling window / first focused item to execute
              // that keydown (inadvertently closing the menu)
              event.preventDefault();
              context.onOpenToggle();
            } else {
              props.onKeyDown?.(event);
            }
          }}
        />
      </MenuPrimitive.Anchor>
    );
  },
);
