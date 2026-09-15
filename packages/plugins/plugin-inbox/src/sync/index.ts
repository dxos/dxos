//
// Copyright 2026 DXOS.org
//

/**
 * The provider-facing mail-sync contract, published as `@dxos/plugin-inbox/sync`.
 *
 * A mail provider plugin (`@dxos/plugin-google`, `@dxos/plugin-jmap`) supplies a
 * {@link MailSyncProvider} layer to {@link runMailSync} and reads its scheduling policy from here; it
 * must reach this module by its own subpath rather than the package root, which pulls in React.
 */

export * from './binding.ts';
export * from './headers.ts';
export * from './mail-sync.ts';
export * from './policy.ts';
export * from './tag-diff.ts';
export * from './tag-push.ts';

// Providers wrap their own failures into this shared type, so it belongs to the contract even though
// it is declared with the plugin's other errors.
export { MailSyncError } from '../errors.ts';
