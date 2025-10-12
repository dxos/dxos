//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { type Scope, createContextScope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentPropsWithRef, forwardRef, useCallback, useEffect, useRef } from 'react';

import { Icon, type IconProps, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { commandItem, searchListItem } from './SearchList';

const LISTBOX_NAME = 'Listbox';
const LISTBOX_OPTION_NAME = 'ListboxOption';
const LISTBOX_OPTION_LABEL_NAME = 'ListboxOptionLabel';
const LISTBOX_OPTION_INDICATOR_NAME = 'ListboxOptionIndicator';

type ListboxScopedProps<P> = P & { __listboxScope?: Scope };
type ListboxOptionScopedProps<P> = P & { __listboxOptionScope?: Scope };

type ListboxRootProps = ThemedClassName<ComponentPropsWithRef<'ul'>> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  autoFocus?: boolean;
};

type ListboxOptionProps = ThemedClassName<ComponentPropsWithRef<'li'>> & {
  value: string;
};

const [createListboxContext, createListboxScope] = createContextScope(LISTBOX_NAME, []);
const [createListboxOptionContext, createListboxOptionScope] = createContextScope(LISTBOX_OPTION_NAME, [
  createListboxScope,
]);

type ListboxContextValue = {
  selectedValue: string | undefined;
  onValueChange: (value: string) => void;
};

type ListboxOptionContextValue = {
  value: string;
  isSelected: boolean;
};

const [ListboxProvider, useListboxContext] = createListboxContext<ListboxContextValue>(LISTBOX_NAME);
const [ListboxOptionProvider, useListboxOptionContext] =
  createListboxOptionContext<ListboxOptionContextValue>(LISTBOX_OPTION_NAME);

// TODO(thure): Note that this overlaps significantly with the the `SelectableListbox` story of `List.tsx` in `react-ui`,
//  making this an exemplar of `List` specifying standard `role="listbox"` interactivity, though it is here because it
//  coheres with SearchList’s styles and norms. This can be promoted to `react-ui`, but doing so should involve clearing
//  the technical- and design-debt in its `List` component.
const ListboxRoot = forwardRef<HTMLUListElement, ListboxRootProps>(
  (props: ListboxScopedProps<ListboxRootProps>, forwardedRef) => {
    const {
      __listboxScope,
      children,
      classNames,
      value: propsValue,
      defaultValue,
      onValueChange,
      autoFocus,
      ...rootProps
    } = props;

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
      (ref.current?.querySelector('[aria-selected="true"]') as HTMLLIElement)?.focus();
    }, [autoFocus]);

    return (
      <ListboxProvider scope={__listboxScope} selectedValue={selectedValue} onValueChange={handleValueChange}>
        <ul
          role='listbox'
          {...rootProps}
          className={mx('p-cardSpacingChrome', classNames)}
          ref={rootRef}
          {...arrowGroup}
        >
          {children}
        </ul>
      </ListboxProvider>
    );
  },
);

ListboxRoot.displayName = LISTBOX_NAME;

const ListboxOption = forwardRef<HTMLLIElement, ListboxOptionProps>(
  (props: ListboxScopedProps<ListboxOptionProps>, forwardedRef) => {
    const { __listboxScope, children, classNames, value, ...rootProps } = props;
    const { selectedValue, onValueChange } = useListboxContext(LISTBOX_OPTION_NAME, __listboxScope);

    const isSelected = selectedValue === value;

    const handleSelect = useCallback(() => {
      onValueChange(value);
    }, [value, onValueChange]);

    return (
      <ListboxOptionProvider scope={__listboxScope} value={value} isSelected={isSelected}>
        <li
          role='option'
          {...rootProps}
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
      </ListboxOptionProvider>
    );
  },
);

ListboxOption.displayName = LISTBOX_OPTION_NAME;

const ListboxOptionLabel = forwardRef<HTMLDivElement, ThemedClassName<ComponentPropsWithRef<'div'>>>(
  ({ children, classNames, ...rootProps }, forwardedRef) => {
    return (
      <span {...rootProps} className={mx('grow truncate', classNames)} ref={forwardedRef}>
        {children}
      </span>
    );
  },
);

ListboxOptionLabel.displayName = LISTBOX_OPTION_LABEL_NAME;

type ListboxOptionIndicatorProps = Omit<IconProps, 'icon'> & Partial<Pick<IconProps, 'icon'>>;

const ListboxOptionIndicator = forwardRef<SVGSVGElement, ListboxOptionIndicatorProps>(
  (props: ListboxOptionScopedProps<ListboxOptionIndicatorProps>, forwardedRef) => {
    const { __listboxOptionScope, classNames, ...rootProps } = props;
    const { isSelected } = useListboxOptionContext(LISTBOX_OPTION_INDICATOR_NAME, __listboxOptionScope);

    return (
      <Icon
        icon='ph--check--regular'
        {...rootProps}
        classNames={mx(!isSelected && 'invisible', classNames)}
        ref={forwardedRef}
      />
    );
  },
);

ListboxOptionIndicator.displayName = LISTBOX_OPTION_INDICATOR_NAME;

export const Listbox = {
  Root: ListboxRoot,
  Option: ListboxOption,
  OptionLabel: ListboxOptionLabel,
  OptionIndicator: ListboxOptionIndicator,
};

export { createListboxScope, useListboxContext };

export type { ListboxRootProps, ListboxOptionProps, ListboxScopedProps };
