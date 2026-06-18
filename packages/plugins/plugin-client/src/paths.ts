//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { Account } from './types';

/** Canonical qualified path to the account profile section. */
export const getAccountProfilePath = (): string => Paths.getSpacePath(Account.id, Account.Profile);

/** Canonical qualified path to the account security section. */
export const getAccountSecurityPath = (): string => Paths.getSpacePath(Account.id, Account.Security);
