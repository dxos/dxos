//
// Copyright 2025 DXOS.org
//

// Eager (non-lazy) re-export of {@link AttentionPlugin}, intended for hosts
// that cannot afford the dynamic-import path used by the default `.` export.
// In particular: vite-dev (storybook test harness) on webkit hits a TDZ where
// `import('./AttentionPlugin')` settles its namespace promise before the
// module body's `export default <expr>` line has executed. Importing eagerly
// from this entrypoint avoids the dynamic-import path entirely. Production
// hosts (vite preview, composer-app) should keep using the default `.`
// import to preserve code splitting.
export * from './AttentionPlugin';
