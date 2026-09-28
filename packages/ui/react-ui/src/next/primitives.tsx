//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { Field as FieldPrimitive } from '@ark-ui/react/field';
import React, {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type SVGProps,
  forwardRef,
} from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { useIconHref } from '../hooks/index.ts';
import { composable, composableProps, slottable } from '../util/index.ts';
import { recipes } from './recipes.ts';
import { useToolbarItem } from './Toolbar.tsx';

//
// Icon
//

export type IconProps = ThemedClassName<Omit<SVGProps<SVGSVGElement>, 'ref'>> & {
  icon: string;
  /** Names the icon for assistive tech; without it the icon is decorative and hidden. */
  label?: string;
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(({ icon, label, classNames, ...props }, forwardedRef) => {
  const href = useIconHref(icon);
  return (
    <svg
      {...props}
      {...(label ? { 'role': 'img', 'aria-label': label } : { 'aria-hidden': true })}
      data-scope='icon'
      data-part='root'
      className={mx(recipes.icon(), classNames)}
      ref={forwardedRef}
    >
      <use href={href} />
    </svg>
  );
});

Icon.displayName = 'Next.Icon';

//
// Typography
//

export type TypographyProps = {};

/**
 * Text whose first line is centred in a block, so it lines up with a Block or control beside it however many lines
 * it wraps to. Renders a `<p>`; `asChild` puts the metrics on a heading or other text element instead.
 */
export const Typography = slottable<HTMLParagraphElement, TypographyProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props, { classNames: recipes.typography() });
    return (
      <ark.p
        asChild={asChild}
        {...rest}
        data-scope='typography'
        data-part='root'
        className={className}
        ref={forwardedRef}
      >
        {children}
      </ark.p>
    );
  },
);

Typography.displayName = 'Next.Typography';

//
// Label
//

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = composable<HTMLLabelElement, LabelProps>(({ children, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: recipes.label() });
  return (
    <label {...rest} data-scope='label' data-part='root' className={className} ref={forwardedRef}>
      {children}
    </label>
  );
});

Label.displayName = 'Next.Label';

//
// Input
//

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Text input at control size; inside a `Field.Root` it takes the field's id, label and description wiring. */
export const Input = composable<HTMLInputElement, InputProps>(({ type = 'text', onFocus, ...props }, forwardedRef) => {
  const toolbarItem = useToolbarItem(props.disabled);
  const { className, ...rest } = composableProps(props, { classNames: recipes.input() });
  return (
    <FieldPrimitive.Input
      {...rest}
      {...toolbarItem}
      onFocus={(event) => {
        onFocus?.(event);
        toolbarItem?.onFocus();
      }}
      type={type}
      data-scope='input'
      data-part='root'
      className={className}
      ref={forwardedRef}
    />
  );
});

Input.displayName = 'Next.Input';

//
// Button
//

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

// `button` by default: the browser's `submit` would post an enclosing form on every click.
export const Button = composable<HTMLButtonElement, ButtonProps>(
  ({ children, type = 'button', onFocus, ...props }, forwardedRef) => {
    const toolbarItem = useToolbarItem(props.disabled);
    const { className, ...rest } = composableProps(props, { classNames: recipes.button() });
    return (
      <button
        {...rest}
        {...toolbarItem}
        onFocus={(event) => {
          onFocus?.(event);
          toolbarItem?.onFocus();
        }}
        type={type}
        data-scope='button'
        data-part='root'
        className={className}
        ref={forwardedRef}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Next.Button';

//
// IconButton
//

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  icon: string;
  /** Required: an icon-only button has no other accessible name. */
  label: string;
};

export const IconButton = composable<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, type = 'button', onFocus, ...props }, forwardedRef) => {
    const toolbarItem = useToolbarItem(props.disabled);
    const { className, ...rest } = composableProps(props, { classNames: recipes.button() });
    return (
      <button
        {...rest}
        {...toolbarItem}
        onFocus={(event) => {
          onFocus?.(event);
          toolbarItem?.onFocus();
        }}
        type={type}
        aria-label={label}
        title={label}
        data-scope='icon-button'
        data-part='root'
        data-square=''
        className={className}
        ref={forwardedRef}
      >
        <Icon icon={icon} />
      </button>
    );
  },
);

IconButton.displayName = 'Next.IconButton';
