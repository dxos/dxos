//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { invitation } from './invitation/index.ts';
import { login } from './login/index.ts';
import { logout } from './logout/index.ts';
import { signup } from './signup/index.ts';

export const account: Command.Command<any, any, any, any, any> = Command.make('account').pipe(
  Command.withDescription('Sign up for a DXOS account, log in and out, and issue invitation codes.'),
  Command.withSubcommands([login, logout, signup, invitation]),
);
