//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { login } from './login';
import { logout } from './logout';
import { signup } from './signup';

export const account: Command.Command<any, any, any, any> = Command.make('account').pipe(
  Command.withDescription('Sign up for a DXOS account and log in and out of a DXOS identity.'),
  Command.withSubcommands([login, logout, signup]),
);
