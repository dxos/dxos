//
// Copyright 2026 DXOS.org
//

// `Collapsible` — a section that folds under its own heading, built on `@ark-ui/react`'s Collapsible
// (zag state machine). The machine owns the open state, pairs the trigger to the section it controls
// (`aria-controls`/`aria-expanded`), measures the section so its height can be animated, and mounts
// or unmounts it around that animation. A stack of these under one caller-owned expansion set is an
// accordion; the machine is per-section so each one stays independent of how the stack is rendered.

import { Collapsible as CollapsiblePrimitive } from '@ark-ui/react/collapsible';
import React from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { composableProps, slottable } from '../../util';

//
// Root
//

const ROOT_NAME = 'Collapsible.Root';

type CollapsibleRootElementProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Nothing to fold: the trigger stops being a control and the section stays as it is. */
  disabled?: boolean;
  /** Render the section only while it is open, so a folded one costs nothing. */
  unmountOnExit?: boolean;
  /** Defer the section's first render until it is opened. */
  lazyMount?: boolean;
};

type CollapsibleRootProps = SlottableProps<CollapsibleRootElementProps>;

const CollapsibleRoot = slottable<HTMLDivElement, CollapsibleRootElementProps>(
  (
    { asChild, children, open, defaultOpen, onOpenChange, disabled, unmountOnExit, lazyMount, ...props },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);

    return (
      <CollapsiblePrimitive.Root
        {...rest}
        asChild={asChild}
        open={open}
        defaultOpen={defaultOpen}
        // The machine reports the new state in a detail object; callers want the boolean.
        onOpenChange={onOpenChange && (({ open: next }) => onOpenChange(next))}
        disabled={disabled}
        unmountOnExit={unmountOnExit}
        lazyMount={lazyMount}
        className={tx('collapsible.root', { disabled }, className)}
        ref={forwardedRef}
      >
        {children}
      </CollapsiblePrimitive.Root>
    );
  },
);

CollapsibleRoot.displayName = ROOT_NAME;

//
// Trigger
//

const TRIGGER_NAME = 'Collapsible.Trigger';

type CollapsibleTriggerProps = SlottableProps;

const CollapsibleTrigger = slottable<HTMLButtonElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);

  return (
    <CollapsiblePrimitive.Trigger
      {...rest}
      asChild={asChild}
      // The machine renders a button, which submits the form around it unless told otherwise.
      type='button'
      className={tx('collapsible.trigger', {}, className)}
      ref={forwardedRef}
    >
      {children}
    </CollapsiblePrimitive.Trigger>
  );
});

CollapsibleTrigger.displayName = TRIGGER_NAME;

//
// Content
//

const CONTENT_NAME = 'Collapsible.Content';

type CollapsibleContentProps = SlottableProps;

const CollapsibleContent = slottable<HTMLDivElement>(({ asChild, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);

  return (
    <CollapsiblePrimitive.Content
      {...rest}
      asChild={asChild}
      className={tx('collapsible.content', {}, className)}
      ref={forwardedRef}
    >
      {children}
    </CollapsiblePrimitive.Content>
  );
});

CollapsibleContent.displayName = CONTENT_NAME;

//
// Collapsible
//

const Collapsible = {
  Root: CollapsibleRoot,
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
};

export { Collapsible };

export type { CollapsibleContentProps, CollapsibleRootProps, CollapsibleTriggerProps };
