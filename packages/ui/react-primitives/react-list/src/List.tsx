//
// Copyright 2023 DXOS.org
//

// Elemental list / listbox primitive.
//
// This is the ARIA-only foundation of the DXOS list stack. It renders a
// semantically-correct `<ol>` / `<ul>` (or, when `selectable={true}`, a
// `role="listbox"` element with `role="option"` children carrying
// `aria-selected`). It applies no styling, no keyboard navigation, and
// no `dx-*` utility classes — those are layered above in
// `@dxos/react-ui-list`.
//
// Layering:
//   - `@dxos/react-list`      — this package; ARIA + structure only.
//   - `@dxos/react-ui-list`   — adds `dx-*` styling, keyboard nav, and
//                               opinionated containers (Listbox, OrderedList,
//                               Tree, Accordion, Combobox, Picker) plus the
//                               reusable navigation/selection/disclosure aspects.
//   - `@dxos/react-ui-mosaic` — virtualized / draggable / card-board
//                               layouts; composes the above where useful.
//
// Most app code should reach for `@dxos/react-ui-list`. Use this primitive
// directly only when building a *new* selectable surface that needs full
// control over styling and keyboard handling (e.g. a custom Combobox).
//
// See:
//   - `packages/ui/ui-theme/src/css/components/state.md` for the
//     `aria-selected` ↔ `dx-selected` pairing rules.
//   - `packages/ui/react-ui-list/AUDIT.md` for why this layering exists.
//   - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listbox_role

import { ark } from '@ark-ui/react/factory';
import React, { forwardRef } from 'react';

import { LIST_NAME, type ListProps, ListProvider } from './ListContext';

const List = forwardRef<HTMLOListElement, ListProps>((props: ListProps, forwardedRef) => {
  const { variant = 'ordered', selectable = false, multiSelectable = false, itemSizes, children, ...rootProps } = props;
  const ListRoot = variant === 'ordered' ? ark.ol : ark.ul;
  return (
    <ListRoot
      // `aria-multiselectable` is only meaningful on `role="listbox"`,
      // and even there is omitted in the single-select default to keep
      // assistive tech announcements concise.
      {...(selectable && {
        role: 'listbox',
        ...(multiSelectable && { 'aria-multiselectable': true as const }),
      })}
      {...rootProps}
      ref={forwardedRef}
    >
      <ListProvider
        {...{
          variant,
          selectable,
          itemSizes,
        }}
      >
        {children}
      </ListProvider>
    </ListRoot>
  );
});

List.displayName = LIST_NAME;

export { List };
