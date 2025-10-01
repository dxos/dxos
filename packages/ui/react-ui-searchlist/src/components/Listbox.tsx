//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { type Scope, createContextScope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentPropsWithRef, type ReactNode, forwardRef, useCallback, useEffect, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { commandItem, searchListItem } from './SearchList';

const LISTBOX_NAME = 'Listbox';
const LISTBOX_OPTION_NAME = 'ListboxOption';

type ListboxScopedProps<P> = P & { __listboxScope?: Scope };

type ListboxRootProps = ThemedClassName<ComponentPropsWithRef<'ul'>> & {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

type ListboxOptionProps = ThemedClassName<ComponentPropsWithRef<'li'>> & {
  value: string;
};

const [createListboxContext, createListboxScope] = createContextScope(LISTBOX_NAME, []);

type ListboxContextValue = {
  selectedValue: string | undefined;
  onValueChange: (value: string) => void;
};

const [ListboxProvider, useListboxContext] = createListboxContext<ListboxContextValue>(LISTBOX_NAME);

const ListboxRoot = forwardRef<HTMLUListElement, ListboxRootProps>(
  (props: ListboxScopedProps<ListboxRootProps>, forwardedRef) => {
    const { __listboxScope, children, classNames, value: propsValue, defaultValue, onValueChange, ...ulProps } = props;

    const arrowGroup = useArrowNavigationGroup({ axis: 'vertical' });
    const ref = useRef<HTMLUListElement | null>(null);
    const rootRef = useComposedRefs<HTMLUListElement>(ref, forwardedRef);

    const [selectedValue, setSelectedValue] = useControllableState({
      prop: propsValue,
      defaultProp: defaultValue,
      onChange: onValueChange,
    });

    const handleValueChange = (value: string) => {
      setSelectedValue(value);
    };

    useEffect(() => {
      // Autofocus the selected option on mount using querySelector
      if (ref.current) {
        const selectedOption = ref.current.querySelector('[aria-selected="true"]') as HTMLLIElement;
        if (selectedOption) {
          selectedOption.focus();
        }
      }
    }, [selectedValue]);

    return (
      <ListboxProvider scope={__listboxScope} selectedValue={selectedValue} onValueChange={handleValueChange}>
        <ul role='listbox' {...ulProps} className={mx('p-cardSpacingChrome', classNames)} ref={rootRef} {...arrowGroup}>
          {children}
        </ul>
      </ListboxProvider>
    );
  },
);

ListboxRoot.displayName = LISTBOX_NAME;

const ListboxOption = forwardRef<HTMLLIElement, ListboxOptionProps>(
  (props: ListboxScopedProps<ListboxOptionProps>, forwardedRef) => {
    const { __listboxScope, children, classNames, value, ...liProps } = props;
    const { selectedValue, onValueChange } = useListboxContext(LISTBOX_OPTION_NAME, __listboxScope);

    const isSelected = selectedValue === value;

    const handleSelect = useCallback(() => {
      onValueChange(value);
    }, [value]);

    return (
      <li
        role='option'
        {...liProps}
        aria-selected={isSelected}
        tabIndex={0}
        className={mx('dx-focus-ring', commandItem, searchListItem, classNames)}
        onClick={handleSelect}
        onKeyDown={({ key }) => {
          if (['Enter', ' '].includes(key)) {
            handleSelect();
          }
        }}
        ref={forwardedRef}
      >
        {children}
      </li>
    );
  },
);

ListboxOption.displayName = LISTBOX_OPTION_NAME;

export const Listbox = {
  Root: ListboxRoot,
  Option: ListboxOption,
};

export { createListboxScope, useListboxContext };

export type { ListboxRootProps, ListboxOptionProps, ListboxScopedProps };
