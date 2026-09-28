//
// Copyright 2026 DXOS.org
//

import React, { type ButtonHTMLAttributes } from 'react';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type ButtonVariantProps } from '../Button/index.ts';
import { Icon } from '../Icon/index.ts';
import { useToolbarItem } from '../Toolbar/index.ts';
import { Tooltip } from '../Tooltip/index.ts';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> &
  ButtonVariantProps & {
    icon: string;
    /** Required: an icon-only button has no other accessible name; also shown in a Tooltip. */
    label: string;
    /** Opt out of the label Tooltip, e.g. when the caller wraps the button in its own `Tooltip.Trigger`. */
    showTooltip?: boolean;
  };

export const IconButton = composable<HTMLButtonElement, IconButtonProps>(
  (
    { icon, label, showTooltip = true, type = 'button', variant = 'default', valence, id, onFocus, ...props },
    forwardedRef,
  ) => {
    const toolbarItem = useToolbarItem(props.disabled);
    const { className, ...rest } = composableProps(props, { classNames: recipes.button() });
    const button = (
      <button
        {...rest}
        {...toolbarItem}
        id={id}
        onFocus={(event) => {
          onFocus?.(event);
          toolbarItem?.onFocus();
        }}
        type={type}
        aria-label={label}
        data-scope='icon-button'
        data-part='root'
        data-square=''
        data-variant={variant}
        data-valence={variant === 'valence' ? valence : undefined}
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
      // An `asChild` parent (e.g. `Popover.Trigger`) may own the id, so the tooltip looks its trigger up by it.
      <Tooltip.Root ids={id ? { trigger: id } : undefined}>
        <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip.Root>
    );
  },
);

IconButton.displayName = 'Next.IconButton';
