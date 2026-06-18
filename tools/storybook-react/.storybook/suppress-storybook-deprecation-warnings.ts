//
// Copyright 2026 DXOS.org
//

const STORYBOOK_DEPRECATION_WARNING_SNIPPETS = [
  "The 'ariaLabel' prop on 'PopoverProvider'",
  '`IconButton` is deprecated',
  "The 'ariaLabel' prop on 'Button'",
  'Accessing the Story Store is deprecated',
] as const;

type FilteredWarn = typeof console.warn & { __dxosStorybookFiltered?: boolean };

/**
 * Storybook 10.3+ emits dev-only deprecation notices from manager and preview internals.
 * Filter known upstream messages until Storybook 11 API migrations are complete.
 */
const suppressStorybookDeprecationWarnings = (): void => {
  const originalWarn = console.warn as FilteredWarn;
  if (originalWarn.__dxosStorybookFiltered) {
    return;
  }

  const filteredWarn: FilteredWarn = (...args: unknown[]) => {
    const message = String(args[0] ?? '');
    if (STORYBOOK_DEPRECATION_WARNING_SNIPPETS.some((snippet) => message.includes(snippet))) {
      return;
    }
    originalWarn(...args);
  };

  filteredWarn.__dxosStorybookFiltered = true;
  console.warn = filteredWarn;
};

suppressStorybookDeprecationWarnings();
