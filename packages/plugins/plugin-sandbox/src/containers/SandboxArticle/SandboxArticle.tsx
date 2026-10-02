//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { LineTerminal } from '@dxos/react-ui-terminal';
import { type TerminalBridge } from '@dxos/react-ui-terminal/cli';

import { type Sandbox, SandboxOperation } from '#types';

/** The article's shell: one per sandbox, shared by every reader who opens it. */
const TERMINAL_SESSION = 'terminal';

const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

export type SandboxArticleProps = AppSurface.ObjectArticleProps<Sandbox.Sandbox>;

/**
 * A shell in the sandbox. Each line is one `Exec` in the article's session, so `cd` and `export`
 * carry from line to line while agents' commands keep running alongside in their own processes.
 */
export const SandboxArticle = ({ role, subject: sandbox }: SandboxArticleProps) => {
  const invoker = useOperationInvoker();
  const spaceId = Obj.getDatabase(sandbox)?.spaceId;

  const evaluate = useCallback(
    (command: string, bridge: TerminalBridge) => {
      if (!spaceId) {
        return Effect.sync(() => bridge.write(`${RED}This sandbox is not in a space.${RESET}\n`));
      }
      return invoker
        .invoke(SandboxOperation.Exec, { sandbox: Ref.make(sandbox), command, session: TERMINAL_SESSION }, { spaceId })
        .pipe(
          Effect.map(({ stdout, stderr, exitCode }) => {
            bridge.write(stdout);
            stderr && bridge.write(`${RED}${stderr}${RESET}`);
            exitCode !== 0 && bridge.write(`${bridge.atLineStart ? '' : '\n'}${DIM}exit ${exitCode}${RESET}\n`);
          }),
          Effect.catch((error) => Effect.sync(() => bridge.write(`${RED}${error.message}${RESET}\n`))),
        );
    },
    [invoker, sandbox, spaceId],
  );

  // No ScrollArea: xterm owns its own viewport and scrollback.
  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <LineTerminal evaluate={evaluate} banner={`${DIM}${sandbox.name ?? 'Sandbox'} · /workspace${RESET}`} />
      </Panel.Content>
    </Panel.Root>
  );
};
