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
    /** Required: names an icon-only button (shown in a Tooltip), or follows the icon as visible text. */
    label: string;
    /** `false` shows the label after the icon, as a Button, with no Tooltip. */
    iconOnly?: boolean;
    /** Opt out of the label Tooltip, e.g. when the caller wraps the button in its own `Tooltip.Trigger`. */
    showTooltip?: boolean;
  };

export const IconButton = composable<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      iconOnly = true,
      showTooltip = true,
      type = 'button',
      variant = 'default',
      valence,
      id,
      onFocus,
      ...props
    },
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
        aria-label={iconOnly ? label : undefined}
        data-scope='icon-button'
        data-part='root'
        data-square={iconOnly ? '' : undefined}
        data-variant={variant}
        data-valence={variant === 'valence' ? valence : undefined}
        className={className}
        ref={forwardedRef}
      >
        <Icon icon={icon} />
        {!iconOnly && label}
      </button>
    );

    if (!iconOnly || !showTooltip) {
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
