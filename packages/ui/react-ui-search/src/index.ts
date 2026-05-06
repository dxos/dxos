//
// Copyright 2026 DXOS.org
//

// `@dxos/react-ui-search` — search-domain components and utilities.
//
// What lives here vs. siblings:
//
//   - `SearchList` / `SearchPanel` — search-themed compound list with
//     a debounced query, auto-select-first, scroll-into-view, and a
//     translated empty state.
//   - `SearchResult` — the rendered hit shape (id + object + label /
//     match / snippet / icon).
//   - `useSearchListResults` — fuzzy filter + ranking via
//     `command-score`.
//
// The generic listbox-with-input pattern (registry, virtual highlight,
// keyboard nav, the two performance-split contexts) lives in
// `@dxos/react-ui-list`'s `Picker` primitive — `SearchList` here is a
// search-themed wrapper around `Picker`.
//
// Cards-of-search-results: see `SearchStack` in `@dxos/react-ui-mosaic`.

export * from './components';
export * from './types';
