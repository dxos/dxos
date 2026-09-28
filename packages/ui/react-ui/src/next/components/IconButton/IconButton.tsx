//
// Copyright 2026 DXOS.org
//

import React, { type ButtonHTMLAttributes } from 'react';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { Icon } from '../Icon/index.ts';
import { useToolbarItem } from '../Toolbar/index.ts';
import { Tooltip } from '../Tooltip/index.ts';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> & {
  icon: string;
  /** Required: an icon-only button has no other accessible name; also shown in a Tooltip. */
  label: string;
  /** Opt out of the label Tooltip, e.g. when the caller wraps the button in its own `Tooltip.Trigger`. */
  showTooltip?: boolean;
};

export const IconButton = composable<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, showTooltip = true, type = 'button', id, onFocus, ...props }, forwardedRef) => {
    const toolbarItem = useToolbarItem(props.disabled);
    const { className, ...rest } = composableProps(props, { classNames: recipes.button() });
    // A toolbar item or an `asChild` parent may own the id, so the tooltip looks its trigger up by it.
    const triggerId = toolbarItem?.id ?? id;
    const button = (
      <button
        {...rest}
        {...toolbarItem}
        id={triggerId}
        onFocus={(event) => {
          onFocus?.(event);
          toolbarItem?.onFocus();
        }}
        type={type}
        aria-label={label}
        data-scope='icon-button'
        data-part='root'
        data-square=''
        className={className}
        ref={forwardedRef}
      >
        <Icon icon={icon} />
      </button>
    );

    if (!showTooltip) {
      return button;
    }

    return (
      <Tooltip.Root ids={triggerId ? { trigger: triggerId } : undefined}>
        <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip.Root>
    );
  },
);

IconButton.displayName = 'Next.IconButton';
