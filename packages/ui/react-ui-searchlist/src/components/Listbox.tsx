//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, { type ComponentPropsWithRef, type ReactNode, forwardRef, useEffect, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const LISTBOX_NAME = 'Listbox';
const LISTBOX_OPTION_NAME = 'ListboxOption';

type ListboxRootProps = ThemedClassName<ComponentPropsWithRef<'ul'>> & {
  children: ReactNode;
};

type ListboxOptionProps = ThemedClassName<ComponentPropsWithRef<'li'>> & {
  selected?: boolean;
  onSelect?: () => void;
};

const ListboxRoot = forwardRef<HTMLUListElement, ListboxRootProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    const arrowGroup = useArrowNavigationGroup({ axis: 'vertical' });
    const ref = useRef<HTMLUListElement | null>(null);
    const rootRef = useComposedRefs<HTMLUListElement>(ref, forwardedRef);

    useEffect(() => {
      // Autofocus the selected option on mount using querySelector
      if (ref.current) {
        const selectedOption = ref.current.querySelector('[aria-selected="true"]') as HTMLLIElement;
        if (selectedOption) {
          selectedOption.focus();
        }
      }
    }, []);

    return (
      <ul role='listbox' {...props} {...arrowGroup} className={mx('p-cardSpacingChrome', classNames)} ref={rootRef}>
        {children}
      </ul>
    );
  },
);

ListboxRoot.displayName = LISTBOX_NAME;

const ListboxOption = forwardRef<HTMLLIElement, ListboxOptionProps>(
  ({ children, classNames, selected = false, onSelect, ...props }, forwardedRef) => {
    return (
      <li
        role='option'
        {...props}
        aria-selected={selected}
        tabIndex={0}
        className={mx('dx-focus-ring', classNames)}
        onClick={() => onSelect?.()}
        onKeyDown={({ key }) => {
          if (['Enter', ' '].includes(key)) {
            onSelect?.();
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

export type { ListboxRootProps, ListboxOptionProps };
