//
// Copyright 2023 DXOS.org
//

// `Select` on Ark's select machine, keeping the children-driven API: Ark takes the options as a
// `collection`, so each `Option` registers itself with the root, which builds the collection from
// what is rendered. Moving consumers to a `collection` prop is a later phase (MIGRATION.md).

import { createListCollection } from '@ark-ui/react/collection';
import { ark } from '@ark-ui/react/factory';
import { Portal } from '@ark-ui/react/portal';
import {
  Select as SelectPrimitive,
  useSelect,
  useSelectContext as useSelectPrimitiveContext,
} from '@ark-ui/react/select';
import React, {
  type ComponentPropsWithRef,
  type FC,
  type ReactNode,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useComposedRefs } from '@dxos/react-hooks';

import { useElevationContext, useSafeCollisionPadding, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Button, type ButtonProps } from '../Button';
import { Icon } from '../Icon';
import { SELECT_NAME, type SelectOptionEntry, SelectProvider, useSelectContext } from './SelectContext';

/** Consumers hand the machine a per-side padding; it takes one number, so the widest side wins. */
const toOverflowPadding = (padding: { top: number; right: number; bottom: number; left: number }) =>
  Math.max(padding.top, padding.right, padding.bottom, padding.left);

/** Document order, which is the order keyboard navigation and typeahead follow. */
const byDocumentPosition = (a: SelectOptionEntry, b: SelectOptionEntry) => {
  if (!a.element || !b.element || a.element === b.element) {
    return 0;
  }
  return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
};

//
// Root
//

type SelectRootProps = {
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  /** A method, so a handler typed for a narrower value union is accepted as Radix's was. */
  onValueChange?(value: string): void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  /** Renders a hidden native `<select>` under this name for the enclosing form. */
  name?: string;
  form?: string;
};

const SelectRoot: FC<SelectRootProps> = ({
  children,
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  required,
  name,
  form,
}) => {
  const [entries, setEntries] = useState<ReadonlyMap<string, SelectOptionEntry>>(() => new Map());
  const register = useCallback((entry: SelectOptionEntry) => {
    setEntries((current) => new Map(current).set(entry.value, entry));
    return () =>
      setEntries((current) => {
        if (current.get(entry.value) !== entry) {
          return current;
        }
        const next = new Map(current);
        next.delete(entry.value);
        return next;
      });
  }, []);

  const collection = useMemo(
    () =>
      createListCollection<SelectOptionEntry>({
        items: [...entries.values()].sort(byDocumentPosition),
        itemToValue: (item) => item.value,
        itemToString: (item) => item.text,
        isItemDisabled: (item) => item.disabled,
      }),
    [entries],
  );

  const safeCollisionPadding = useSafeCollisionPadding(8);
  const positioning = useMemo(
    () => ({
      strategy: 'fixed' as const,
      placement: 'bottom-start' as const,
      overflowPadding: toOverflowPadding(safeCollisionPadding),
    }),
    [safeCollisionPadding],
  );

  const select = useSelect<SelectOptionEntry>({
    collection,
    value: value === undefined ? undefined : value === '' ? [] : [value],
    defaultValue: defaultValue === undefined ? undefined : [defaultValue],
    onValueChange: ({ value: next }) => onValueChange?.(next[0] ?? ''),
    open,
    defaultOpen,
    onOpenChange: ({ open: next }) => onOpenChange?.(next),
    disabled,
    required,
    name,
    form,
    positioning,
  });

  const context = useMemo(() => ({ register, entries }), [register, entries]);

  return (
    // The options register from inside the content, so it stays mounted (hidden) while closed —
    // where Radix kept it in a detached fragment — and the root's element takes no space.
    <SelectPrimitive.RootProvider value={select} className='contents'>
      <SelectProvider {...context}>{children}</SelectProvider>
      {name && <SelectPrimitive.HiddenSelect />}
    </SelectPrimitive.RootProvider>
  );
};

SelectRoot.displayName = 'Select.Root';

//
// Trigger
//

type SelectTriggerProps = ComponentPropsWithRef<typeof SelectPrimitive.Trigger>;

const SelectTrigger = SelectPrimitive.Trigger;

//
// Value
//

const VALUE_NAME = 'Select.Value';

type SelectValueProps = ComponentPropsWithRef<typeof SelectPrimitive.ValueText>;

/** Shows the selected option as it rendered itself, so an option with an icon keeps it here. */
const SelectValue = forwardRef<HTMLSpanElement, SelectValueProps>(({ children, ...props }, forwardedRef) => {
  const select = useSelectPrimitiveContext();
  const { entries } = useSelectContext(VALUE_NAME);
  const selected = select.value[0];
  const entry = selected === undefined ? undefined : entries.get(selected);
  return (
    <SelectPrimitive.ValueText {...props} ref={forwardedRef}>
      {children ?? entry?.node ?? undefined}
    </SelectPrimitive.ValueText>
  );
});

SelectValue.displayName = VALUE_NAME;

//
// Icon
//

type SelectIconProps = ComponentPropsWithRef<typeof SelectPrimitive.Indicator>;

const SelectIcon = SelectPrimitive.Indicator;

//
// Portal
//

type SelectPortalProps = {
  children?: ReactNode;
  /** Specify a container element to portal the content into. */
  container?: HTMLElement | null;
};

const SelectPortal = ({ children, container }: SelectPortalProps) => {
  const containerRef = useMemo(() => (container ? { current: container } : undefined), [container]);
  return <Portal container={containerRef}>{children}</Portal>;
};

SelectPortal.displayName = 'Select.Portal';

//
// TriggerButton
//

type SelectTriggerButtonProps = Omit<ButtonProps, 'children'> & Pick<SelectValueProps, 'placeholder' | 'children'>;

const SelectTriggerButton = forwardRef<HTMLButtonElement, SelectTriggerButtonProps>(
  ({ children, placeholder, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.Trigger asChild ref={forwardedRef}>
        <Button {...props} classNames={tx('select.triggerButton', {}, classNames)}>
          <SelectValue placeholder={placeholder}>{children}</SelectValue>
          <SelectPrimitive.Indicator asChild>
            <Icon size={3} icon='ph--caret-down--bold' />
          </SelectPrimitive.Indicator>
        </Button>
      </SelectPrimitive.Trigger>
    );
  },
);

SelectTriggerButton.displayName = 'Select.TriggerButton';

//
// Content
//

type SelectContentProps = ThemedClassName<ComponentPropsWithRef<typeof SelectPrimitive.Content>>;

const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const elevation = useElevationContext();
    return (
      <SelectPrimitive.Positioner className={tx('select.positioner', { elevation })}>
        <SelectPrimitive.Content
          {...props}
          data-arrow-keys='up down'
          className={tx('select.content', { elevation }, classNames)}
          ref={forwardedRef}
        >
          {children}
        </SelectPrimitive.Content>
      </SelectPrimitive.Positioner>
    );
  },
);

SelectContent.displayName = 'Select.Content';

//
// Viewport
//

type SelectViewportProps = ThemedClassName<ComponentPropsWithRef<typeof SelectPrimitive.List>>;

const SelectViewport = forwardRef<HTMLDivElement, SelectViewportProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.List {...props} className={tx('select.viewport', {}, classNames)} ref={forwardedRef}>
        {children}
      </SelectPrimitive.List>
    );
  },
);

SelectViewport.displayName = 'Select.Viewport';

//
// Item
//

const ITEM_NAME = 'Select.Item';

type SelectItemProps = ThemedClassName<
  Omit<ComponentPropsWithRef<typeof SelectPrimitive.Item>, 'item' | 'value'> & {
    value: string;
    /** What typeahead matches when the children are not plain text. */
    textValue?: string;
    disabled?: boolean;
  }
>;

type SelectItemImplProps = SelectItemProps & {
  /** What the trigger shows for this item when selected; the item's children unless given. */
  node?: ReactNode;
};

const SelectItemImpl = forwardRef<HTMLDivElement, SelectItemImplProps>(
  ({ classNames, value, textValue, disabled = false, node, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { register } = useSelectContext(ITEM_NAME);
    const elementRef = useRef<HTMLDivElement | null>(null);
    const item = useMemo(() => ({ value, text: textValue ?? '', disabled }), [value, textValue, disabled]);

    // The entry the collection holds; its text is the rendered text unless given, and its node is
    // whatever rendered last, read by the trigger at its own render.
    const valueNode = node ?? children;
    const entryRef = useRef<SelectOptionEntry | null>(null);
    useLayoutEffect(() => {
      const element = elementRef.current;
      const entry: SelectOptionEntry = {
        value,
        text: textValue ?? element?.textContent ?? '',
        node: valueNode,
        disabled,
        element,
      };
      entryRef.current = entry;
      return register(entry);
      // The node is refreshed by the effect below rather than re-registering on every render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [register, value, textValue, disabled]);
    useLayoutEffect(() => {
      if (entryRef.current) {
        entryRef.current.node = valueNode;
      }
    });

    return (
      <SelectPrimitive.Item
        {...props}
        item={item}
        className={tx('select.item', {}, classNames)}
        ref={useComposedRefs(forwardedRef, elementRef)}
      >
        {children}
      </SelectPrimitive.Item>
    );
  },
);

SelectItemImpl.displayName = ITEM_NAME;

const SelectItem: typeof SelectItemImpl = SelectItemImpl;

//
// ItemText / ItemIndicator
//

type SelectItemTextProps = ComponentPropsWithRef<typeof SelectPrimitive.ItemText>;

const SelectItemText = SelectPrimitive.ItemText;

type SelectItemIndicatorProps = ThemedClassName<ComponentPropsWithRef<typeof SelectPrimitive.ItemIndicator>>;

const SelectItemIndicator = forwardRef<HTMLDivElement, SelectItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.ItemIndicator
        {...props}
        className={tx('select.itemIndicator', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </SelectPrimitive.ItemIndicator>
    );
  },
);

SelectItemIndicator.displayName = 'Select.ItemIndicator';

//
// Option
//

type SelectOptionProps = SelectItemProps;

const SelectOption = forwardRef<HTMLDivElement, SelectOptionProps>(({ children, ...props }, forwardedRef) => {
  return (
    <SelectItemImpl {...props} node={children} ref={forwardedRef}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className='grow' />
      <Icon size={3} icon='ph--check--regular' />
    </SelectItemImpl>
  );
});

SelectOption.displayName = 'Select.Option';

//
// Group / Label / Separator
//

type SelectGroupProps = ComponentPropsWithRef<typeof SelectPrimitive.ItemGroup>;

const SelectGroup = SelectPrimitive.ItemGroup;

type SelectLabelProps = ComponentPropsWithRef<typeof SelectPrimitive.ItemGroupLabel>;

const SelectLabel = SelectPrimitive.ItemGroupLabel;

type SelectSeparatorProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>>;

const SelectSeparator = forwardRef<HTMLDivElement, SelectSeparatorProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ark.div
      role='separator'
      aria-orientation='horizontal'
      {...props}
      className={tx('select.separator', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

SelectSeparator.displayName = 'Select.Separator';

//
// Select
//

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  TriggerButton: SelectTriggerButton,
  Value: SelectValue,
  Icon: SelectIcon,
  Portal: SelectPortal,
  Content: SelectContent,
  Viewport: SelectViewport,
  Item: SelectItem,
  ItemText: SelectItemText,
  ItemIndicator: SelectItemIndicator,
  Option: SelectOption,
  Group: SelectGroup,
  Label: SelectLabel,
  Separator: SelectSeparator,
};

export { SELECT_NAME };

export type {
  SelectContentProps,
  SelectGroupProps,
  SelectIconProps,
  SelectItemIndicatorProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectLabelProps,
  SelectOptionProps,
  SelectPortalProps,
  SelectRootProps,
  SelectSeparatorProps,
  SelectTriggerButtonProps,
  SelectTriggerProps,
  SelectValueProps,
  SelectViewportProps,
};
