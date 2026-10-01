//
// Copyright 2026 DXOS.org
//

import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

import { type ChromaticPalette, type MessageValence, type NeutralPalette } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { useFieldsetDisabled } from '../Fieldset/index.ts';
import { Icon } from '../Icon/index.ts';
import { useToolbarItem } from '../Toolbar/index.ts';
import { Tooltip, type TooltipSide } from '../Tooltip/index.ts';

/** The current Button's variants; `primary` marks the one action a surface leads with (e.g. a form's Save). */
export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'outline' | 'destructive' | 'valence';

export type ButtonValence = MessageValence;

/** Tag's palette (`Next.TagHue`), repeated here since Tag builds on nothing of Button's. */
export type ButtonHue = NeutralPalette | ChromaticPalette | MessageValence;

export type ButtonVariantProps = {
  variant?: ButtonVariant;
  /** Colour of the `valence` variant; without it the button adopts an enclosing valence surface's, else neutral. */
  valence?: ButtonValence;
  /** Fills the button with a Tag's hue (`--color-<hue>-surface`/`-fg`), in place of the variant's fill. */
  hue?: ButtonHue;
  /**
   * Dense inline padding (one control inset), e.g. for a run of pager buttons. An icon-only button loses its square,
   * narrowing to its icon plus an inset either side, and compact icon-only buttons in an Input adornment abut (a
   * stepper's − and +).
   */
  compact?: boolean;
  /** A trailing caret marking a button that opens a menu. */
  caretDown?: boolean;
  /** `start` packs icon and label at the start (a full-width menu-like button) instead of centring them. */
  align?: 'center' | 'start';
  /** Spins the leading icon, as a busy indicator. */
  spin?: boolean;
  /** The icons at this size's scale instead of the button's. */
  iconSize?: Size;
};

/** Content is a label (or children) with optional leading/trailing icons, or a lone icon named by its label. */
export type ButtonContentProps =
  | {
      /** Leading icon. */
      icon?: string;
      /** Trailing icon (e.g. a caret). */
      iconEnd?: string;
      /** Visible text; `children` take precedence. */
      label?: string;
      iconOnly?: false;
      showTooltip?: never;
      tooltipSide?: never;
      children?: ReactNode;
    }
  | {
      icon: string;
      /** Required: names the button (`aria-label`) and shows in a Tooltip. */
      label: string;
      /** A control-sized square inset in a block-sized cell (follow-up 19), showing only the icon. */
      iconOnly: true;
      /** Opt out of the label Tooltip, e.g. when the caller wraps the button in its own `Tooltip.Trigger`. */
      showTooltip?: boolean;
      /** Side of the trigger the label Tooltip opens on; below by default. */
      tooltipSide?: TooltipSide;
      iconEnd?: never;
      children?: never;
    };

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> &
  ButtonVariantProps &
  ButtonContentProps;

// `button` by default: the browser's `submit` would post an enclosing form on every click.
export const Button = composable<HTMLButtonElement, ButtonProps>(
  (
    {
      type = 'button',
      variant = 'default',
      valence,
      hue,
      compact,
      caretDown,
      align,
      spin,
      iconSize,
      id,
      onFocus,
      icon,
      iconEnd,
      label,
      iconOnly,
      showTooltip = true,
      tooltipSide,
      children,
      ...buttonProps
    },
    forwardedRef,
  ) => {
    const disabled = useFieldsetDisabled(buttonProps.disabled);
    const toolbarItem = useToolbarItem(disabled);
    const { className, ...attributes } = composableProps(buttonProps, { classNames: recipes.button() });
    const button = (
      <button
        {...attributes}
        disabled={disabled}
        {...toolbarItem}
        id={id}
        onFocus={(event) => {
          onFocus?.(event);
          toolbarItem?.onFocus();
        }}
        type={type}
        aria-label={iconOnly ? label : undefined}
        data-scope='button'
        data-part='root'
        data-square={iconOnly ? '' : undefined}
        data-variant={variant}
        data-valence={variant === 'valence' ? valence : undefined}
        data-hue={hue}
        data-compact={compact ? '' : undefined}
        data-caret={caretDown ? '' : undefined}
        data-align={align === 'start' ? align : undefined}
        className={className}
        ref={forwardedRef}
      >
        {icon && <Icon icon={icon} spin={spin} size={iconSize} />}
        {!iconOnly && (children ?? label)}
        {iconEnd && <Icon icon={iconEnd} size={iconSize} />}
        {caretDown && <Icon icon='ph--caret-down--bold' />}
      </button>
    );

    if (!iconOnly || !showTooltip) {
      return button;
    }

    return (
      // An `asChild` parent (e.g. `Popover.Trigger`) may own the id, so the tooltip looks its trigger up by it.
      <Tooltip.Root
        ids={id ? { trigger: id } : undefined}
        positioning={tooltipSide ? { placement: tooltipSide } : undefined}
      >
        <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip.Root>
    );
  },
);

Button.displayName = 'Next.Button';
