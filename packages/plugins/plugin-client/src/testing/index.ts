//
// Copyright 2025 DXOS.org
//

export * as ClientPlugin from '#meta';
export { BindTestAccountError, type BindTestAccountOptions, bindTestAccount } from './bindTestAccount.ts';
export { createFakeContacts } from './createFakeContacts.ts';
export { initializeIdentity } from './initializeIdentity.ts';
export { type TestAccountState, useTestAccount } from './useTestAccount.ts';
export * from './ClientPluginManager.tsx';
