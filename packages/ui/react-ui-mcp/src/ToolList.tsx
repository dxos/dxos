//
// Copyright 2026 DXOS.org
//

// Composable list view over MCP tool definitions. Built on `@dxos/react-ui-list`'s
// `Listbox` + `Listbox.Item` selectable-listbox primitives, with each part exposed as its own
// component so consumers can either drop in `<ToolList ... />` for the default layout or
// assemble exactly the surface they need (just titles, custom row, header chips, etc.).
//
// Each subcomponent accepts `classNames` via `@dxos/react-ui`'s `ThemedClassName` so
// consumers can layer Tailwind classes on top of the theme defaults without forking the
// component.

import React, { type ComponentProps, Fragment, type PropsWithChildren, type ReactNode } from 'react';

import { type ThemedClassName, composable, composableProps } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

/**
 * Public shape of an item in the list. Mirrors what
 * `@dxos/introspect-mcp/tools`'s `createToolDefinitions` produces (title +
 * description) plus an `id` so the list can key rows and surface selection
 * state. Consumers may pass richer records — only these fields are read.
 */
export type Tool = {
  /** Stable identifier — typically the tool name (`list_packages`, etc.). */
  id: string;
  /** Human-readable title surfaced to the user. */
  title: string;
  /** Optional one-line summary; rendered below the title in default rows. */
  description?: string;
};

//
// Root — wraps `Listbox.Root` so descendant `ToolList.Item` rows participate in
// the listbox's single-select model. `Listbox` itself supplies the selection context
// (`useListboxSelection` reads back the active id), so `ToolList` doesn't ship its own.
//

export type ToolListRootProps = PropsWithChildren<{
  /** Selected tool id; null when no row is highlighted. */
  selectedId?: string | null;
  /** Called when the user picks a tool. */
  onSelect?: (id: string) => void;
}>;

const ToolListRoot = ({ selectedId, onSelect, children }: ToolListRootProps): ReactNode => (
  <Listbox.Root value={selectedId ?? undefined} onValueChange={onSelect}>
    {children}
  </Listbox.Root>
);
ToolListRoot.displayName = 'ToolList.Root';

//
// Content — the `role=listbox` container that renders rows from `tools`.
//

export type ToolListContentProps = ThemedClassName<{
  /** The tools to render. Order is preserved as-is. */
  tools: readonly Tool[];
  /**
   * Optional render override for each row. Default renders title +
   * description via `<ToolList.Item>`. Override when you want extra row
   * content (badges, kbd hints, etc.). (Not `children` so the part can be a
   * `composable` Slot target — see below.)
   */
  renderItem?: (tool: Tool) => ReactNode;
}>;

// `composable` so a parent `<… asChild>` (Slot) is respected — the injected className/ref
// land on the listbox's `<ul>` (which `Listbox.Content` renders via `@dxos/react-list`).
const ToolListContent = composable<HTMLUListElement, ToolListContentProps>(
  ({ tools, renderItem, ...props }, forwardedRef) => (
    <Listbox.Content
      {...composableProps<HTMLUListElement>(props, { classNames: 'flex flex-col gap-px' })}
      aria-label='Tools'
      ref={forwardedRef}
    >
      {tools.map((tool) =>
        renderItem ? <Fragment key={tool.id}>{renderItem(tool)}</Fragment> : <ToolListItem key={tool.id} tool={tool} />,
      )}
    </Listbox.Content>
  ),
);
ToolListContent.displayName = 'ToolList.Content';

//
// Item
//

export type ToolListItemProps = ThemedClassName<
  PropsWithChildren<{
    tool: Tool;
  }>
>;

const ToolListItem = ({ classNames, tool, children }: ToolListItemProps): ReactNode => {
  return (
    <Listbox.Item
      id={tool.id}
      classNames={mx(
        // Tailwind tokens follow the conventions used in `react-ui-list`: `dx-hover`
        // and `dx-selected` are theme states that adapt to dark mode (already applied
        // by `Listbox.Item`). We layer the consumer's `classNames` last so they win on conflict.
        'flex flex-col gap-0.5 rounded',
        classNames,
      )}
    >
      {children ?? (
        <>
          <ToolListItemTitle>{tool.title}</ToolListItemTitle>
          {tool.description ? <ToolListItemDescription>{tool.description}</ToolListItemDescription> : null}
        </>
      )}
    </Listbox.Item>
  );
};
ToolListItem.displayName = 'ToolList.Item';

//
// ItemTitle
//

export type ToolListItemTitleProps = ThemedClassName<ComponentProps<'span'>>;

const ToolListItemTitle = ({ classNames, ...props }: ToolListItemTitleProps): ReactNode => (
  <span className={mx('truncate text-sm font-medium', classNames)} {...props} />
);
ToolListItemTitle.displayName = 'ToolList.ItemTitle';

//
// ItemDescription
//

export type ToolListItemDescriptionProps = ThemedClassName<ComponentProps<'span'>>;

const ToolListItemDescription = ({ classNames, ...props }: ToolListItemDescriptionProps): ReactNode => (
  <span
    className={mx(
      // Subtler text + clamp to two lines so a long description doesn't
      // dominate the row.
      'line-clamp-2 text-xs text-subdued',
      classNames,
    )}
    {...props}
  />
);
ToolListItemDescription.displayName = 'ToolList.ItemDescription';

//
// ToolList namespace — drop-in or compose-it-yourself.
//
// Default usage:
//
//   <ToolList.Root selectedId={id} onSelect={setId}>
//     <ToolList.Content tools={tools} />
//   </ToolList.Root>
//
// Custom row content:
//
//   <ToolList.Root selectedId={id} onSelect={setId}>
//     <ToolList.Content
//       tools={tools}
//       renderItem={(tool) => (
//         <ToolList.Item key={tool.id} tool={tool}>
//           <Badge>{tool.id}</Badge>
//           <ToolList.ItemTitle>{tool.title}</ToolList.ItemTitle>
//         </ToolList.Item>
//       )}
//     />
//   </ToolList.Root>
//

export const ToolList = {
  Root: ToolListRoot,
  Content: ToolListContent,
  Item: ToolListItem,
  ItemTitle: ToolListItemTitle,
  ItemDescription: ToolListItemDescription,
};

// Direct exports too for callers that prefer them over the namespace.
export { ToolListContent, ToolListItem, ToolListItemDescription, ToolListItemTitle, ToolListRoot };
