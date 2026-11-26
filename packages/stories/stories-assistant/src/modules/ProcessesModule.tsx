//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Process from '@dxos/compute/Process';
import { Command } from '@dxos/permission';
import { ProcessTree } from '@dxos/react-ui-trace';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

/** The commands one authority's grants hold. */
const commandsOf = (authority: Process.Authority): readonly Command.Command[] =>
  authority.grants.flatMap((grant) => grant.permissions.map(({ command }) => command));

/**
 * The commands a process may run: those every authority it is held to covers, since each must admit a call. A command
 * prefix covers what lies beneath it, so `/crm` held above `/crm/write` held below leaves `/crm/write`.
 */
export const effectiveCommands = (authorities: readonly Process.Authority[]): readonly Command.Command[] => {
  const [first, ...rest] = authorities.map(commandsOf);
  if (first === undefined) {
    return [];
  }
  const candidates = [...new Set([first, ...rest].flat())];
  return candidates.filter((command) =>
    [first, ...rest].every((held) => held.some((parent) => Command.covers(parent, command))),
  );
};

/** The last path segment of a principal URI, which names it well enough in a row: `agent://crm/Ledger` is `Ledger`. */
const shortPrincipal = (principal: string): string => principal.split('/').filter(Boolean).at(-1) ?? principal;

/** A process's row label: its name, who it acts as, and the commands it may run. */
export const processLabel = (process: Process.Process): string => {
  const name = process.params.name ?? process.key;
  const authorities = process.authorities ?? [];
  const own = authorities.at(-1);
  if (own === undefined) {
    return `${name} · no authority`;
  }
  const commands = effectiveCommands(authorities);
  return `${name} · ${shortPrincipal(own.principal)}: ${commands.length > 0 ? commands.join(', ') : 'no permissions'}`;
};

/** Every process of the story's runtime as a tree, each row listing who it acts as and what it may do. */
export const ProcessesModule = () => {
  const manager = Hooks.useCapability(Capabilities.ProcessManager);
  const processes = useAtomValue(manager.processTreeAtom);
  return (
    <Panel.Root data-testid='processes-module'>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport>
            <ProcessTree processes={processes} depth={4} resolveLabel={processLabel} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
