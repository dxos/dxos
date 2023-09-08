//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { createPopperScope } from '@radix-ui/react-popper';
import * as PopperPrimitive from '@radix-ui/react-popper';
import { useCombobox, UseComboboxReturnValue } from 'downshift';
import React, { forwardRef, PropsWithChildren } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { Button } from '../Buttons';
import { Input } from '../Input';

const SELECTOR_NAME = 'Selector';

type ScopedProps<P> = P & { __scopeSelector?: Scope };

type ValueAdapter<T> = (value: T) => { id: string; text: string };

type SelectorContextValue<T> = {
  items: T[];
  adapter: ValueAdapter<T>;
} & UseComboboxReturnValue<T>;

const usePopperScope = createPopperScope();
// TODO(burdon): Warning:
//  TS2742: The inferred type of createSelectorScope cannot be named without a reference to...
const [createSelectorContext, createSelectorScope] = createContextScope(SELECTOR_NAME, [createPopperScope]);
const [SelectorProvider, useSelectorContext] = createSelectorContext<SelectorContextValue<any>>(SELECTOR_NAME);

type SelectorRootProps<T> = ThemedClassName<
  ScopedProps<
    PropsWithChildren<{
      placeholder?: string;
      items?: T[];
      value?: T; // TODO(burdon): Rename selected?
      adapter: ValueAdapter<T>;
      onChange?: (value: T | undefined) => void;
      onInputChange?: (text?: string) => void;
    }>
  >
>;

/**
 * Type-ahead selector.
 * https://www.downshift-js.com
 */
// TODO(burdon): Rename Combobox?
const SelectorRoot = <T,>({
  __scopeSelector,
  children,
  classNames,
  placeholder,
  items,
  value,
  adapter,
  onChange,
  onInputChange,
}: SelectorRootProps<T>) => {
  const { tx } = useThemeContext();
  const popperScope = usePopperScope(__scopeSelector);

  // https://www.downshift-js.com/use-combobox
  const comboProps = useCombobox<T>({
    items: items ?? [],
    selectedItem: value ?? null,
    itemToString: (selectedItem) => (selectedItem ? adapter(selectedItem).text : ''),
    onInputValueChange: ({ inputValue }) => onInputChange?.(inputValue),
    onSelectedItemChange: ({ selectedItem }) => onChange?.(selectedItem === null ? undefined : selectedItem),
  });

  // TODO(burdon): Show as DIV unless focused (performance and to see ellipsis values)?
  return (
    <PopperPrimitive.Root {...popperScope}>
      <SelectorProvider scope={__scopeSelector} adapter={adapter} items={items ?? []} {...comboProps}>
        <div className={tx('selector.root', 'selector__root', {}, classNames)}>
          <SelectorAnchor placeholder={placeholder} />
          <SelectorContent />
        </div>
      </SelectorProvider>
    </PopperPrimitive.Root>
  );
};

//
// Anchor
//

const ANCHOR_NAME = 'SelectorAnchor';

type SelectorAnchorProps = ThemedClassName<
  ScopedProps<
    PropsWithChildren<{
      placeholder?: string;
    }>
  >
>;

// TODO(burdon): forwardRef
const SelectorAnchor = ({ __scopeSelector, classNames, placeholder }: SelectorAnchorProps) => {
  const { tx } = useThemeContext();
  const popperScope = usePopperScope(__scopeSelector);
  const { getInputProps, getToggleButtonProps, isOpen } = useSelectorContext(ANCHOR_NAME, __scopeSelector);

  return (
    <PopperPrimitive.Anchor asChild {...popperScope}>
      <div className='flex items-center gap-1'>
        <Input.Root>
          <Input.TextInput
            {...getInputProps()}
            placeholder={placeholder}
            variant='subdued'
            classNames={tx('selector.input', 'selector__input', {}, classNames)}
          />
        </Input.Root>
        <Button
          {...getToggleButtonProps()}
          aria-label='toggle menu'
          variant='ghost'
          classNames={tx('selector.button', 'selector__button', {}, classNames)}
        >
          {/* TODO(burdon): SelectPrimitive.Icon? */}
          {(isOpen && <CaretUp />) || <CaretDown />}
        </Button>
      </div>
    </PopperPrimitive.Anchor>
  );
};

//
// Content
//

const CONTENT_NAME = 'SelectorContent';

type SelectorContentProps = ThemedClassName<ScopedProps<PropsWithChildren<{}>>>;

const SelectorContent = forwardRef<HTMLDivElement>(
  ({ __scopeSelector, classNames }: SelectorContentProps, forwardedRef) => {
    const { tx } = useThemeContext();
    const popperScope = usePopperScope(__scopeSelector);
    const { adapter, items, getMenuProps, getItemProps, highlightedIndex, selectedItem, isOpen } = useSelectorContext(
      CONTENT_NAME,
      __scopeSelector,
    );

    // if (!isOpen) {
    //   return null;
    // }

    return (
      <div>
        <PopperPrimitive.Content
          data-state={isOpen}
          role='dialog'
          {...popperScope}
          ref={forwardedRef}
          style={
            {
              // re-namespace exposed content custom properties
              ...{
                '--radix-selector-content-transform-origin': 'var(--radix-popper-transform-origin)',
                '--radix-selector-content-available-width': 'var(--radix-popper-available-width)',
                '--radix-selector-content-available-height': 'var(--radix-popper-available-height)',
                '--radix-selector-trigger-width': 'var(--radix-popper-anchor-width)',
                '--radix-selector-trigger-height': 'var(--radix-popper-anchor-height)',
              },
            } as any // TODO(burdon): Why is this needed?
          }
        >
          <ul {...getMenuProps()} className={tx('selector.content', 'selector__content', {}, classNames)}>
            {items.map((item, index) => (
              <li
                key={adapter(item).id}
                data-selected={selectedItem === item ? 'true' : undefined}
                data-highlighted={highlightedIndex === index ? 'true' : undefined}
                {...getItemProps({
                  index,
                  item,
                  className: tx('selector.item', 'selector__item', {}, classNames),
                })}
              >
                {adapter(item).text}
              </li>
            ))}
          </ul>
        </PopperPrimitive.Content>
      </div>
    );
  },
);

export { createSelectorScope };

// prettier-ignore
export const Selector = {
  Root: SelectorRoot,
  Anchor: SelectorAnchor,
  Content: SelectorContent,
};

export type { SelectorRootProps, SelectorAnchorProps, SelectorContentProps };
