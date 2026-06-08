//
// Copyright 2026 DXOS.org
//

// Composable list view over MCP tool definitions. Built on
// `@dxos/react-ui-list`'s `List.Root` / `List.Item` primitives, with each
// part exposed as its own component so consumers can either drop in
// `<ToolList ... />` for the default layout or assemble exactly the surface
// they need (just titles, custom row, header chips, etc.).
//
// Each subcomponent accepts `classNames` via `@dxos/react-ui`'s
// `ThemedClassName` so consumers can layer Tailwind classes on top of the
// theme defaults without forking the component.

import React, {
  type ComponentProps,
  type PropsWithChildren,
  type ReactNode,
  createContext,
  useContext,
  useMemo,
} from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { List as NaturalList } from '@dxos/react-ui-list';
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
// Context — lets nested `<ToolList.Item>` rows pull selection state from the
// parent `<ToolList.Root>` without prop drilling. Keeps the composable shape
// flat from a consumer's perspective.
//

type ToolListContextValue = {
  selectedId: string | null;
  onSelect?: (id: string) => void;
};

const ToolListContext = createContext<ToolListContextValue | null>(null);

const useToolListContext = (): ToolListContextValue => {
  const ctx = useContext(ToolListContext);
  if (!ctx) {
    throw new Error('ToolList.Item must be rendered inside a <ToolList.Root>');
  }
  return ctx;
};

//
// Root — headless; provides selection context only. Render a `ToolList.Content`
// (or a custom listbox) inside it.
//

export type ToolListRootProps = PropsWithChildren<{
  /** Selected tool id; null when no row is highlighted. */
  selectedId?: string | null;
  /** Called when the user picks a tool. */
  onSelect?: (id: string) => void;
}>;

const ToolListRoot = ({ selectedId = null, onSelect, children }: ToolListRootProps): ReactNode => {
  // Stable context value across renders that don't change selection so memoized
  // children don't re-render unnecessarily.
  const value = useMemo<ToolListContextValue>(() => ({ selectedId, onSelect }), [selectedId, onSelect]);
  return <ToolListContext.Provider value={value}>{children}</ToolListContext.Provider>;
};
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
   * content (badges, kbd hints, etc.).
   */
  children?: (tool: Tool) => ReactNode;
}>;

const ToolListContent = ({ classNames, tools, children }: ToolListContentProps): ReactNode => (
  <NaturalList.Root<Tool> items={tools as Tool[]} getId={(t) => t.id}>
    {({ items }) => (
      <div role='listbox' className={mx('flex flex-col gap-px', classNames)}>
        {items?.map((tool) => (children ? children(tool) : <ToolListItem key={tool.id} tool={tool} />))}
      </div>
    )}
  </NaturalList.Root>
);
ToolListContent.displayName = 'ToolList.Content';

//
// Item
//

export type ToolListItemProps = ThemedClassName<
  PropsWithChildren<{
    tool: Tool;
    /** Forces selected styling regardless of context state. */
    selected?: boolean;
  }>
>;

const ToolListItem = ({ classNames, tool, selected: selectedProp, children }: ToolListItemProps): ReactNode => {
  const { selectedId, onSelect } = useToolListContext();
  const selected = selectedProp ?? selectedId === tool.id;
  return (
    <NaturalList.Item<Tool>
      item={tool}
      selected={selected}
      classNames={mx(
        // Tailwind tokens follow the conventions used in `react-ui-list`:
        // `dx-hover` and `dx-selected` are theme states that adapt to dark
        // mode. We layer the consumer's `classNames` last so they win on conflict.
        'cursor-pointer rounded px-2 py-1',
        classNames,
      )}
    >
      <button
        type='button'
        className='flex w-full flex-col gap-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accentSurface'
        onClick={() => onSelect?.(tool.id)}
      >
        {children ?? (
          <>
            <ToolListItemTitle>{tool.title}</ToolListItemTitle>
            {tool.description ? <ToolListItemDescription>{tool.description}</ToolListItemDescription> : null}
          </>
        )}
      </button>
    </NaturalList.Item>
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
//     <ToolList.Content tools={tools}>
//       {(tool) => (
//         <ToolList.Item key={tool.id} tool={tool}>
//           <Badge>{tool.id}</Badge>
//           <ToolList.ItemTitle>{tool.title}</ToolList.ItemTitle>
//         </ToolList.Item>
//       )}
//     </ToolList.Content>
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
export { ToolListRoot, ToolListContent, ToolListItem, ToolListItemTitle, ToolListItemDescription };
