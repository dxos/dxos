//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';

import { SandboxTerminal } from '#components';
import { type Sandbox, SandboxOperation, SandboxService } from '#types';

export type SandboxArticleProps = AppSurface.ObjectArticleProps<Sandbox.Sandbox>;

/** An interactive shell in the sandbox, reached through the same operation runtime as its tools. */
export const SandboxArticle = ({ role, subject: sandbox }: SandboxArticleProps) => {
  const invoker = useOperationInvoker();
  const spaceId = Obj.getDatabase(sandbox)?.spaceId;

  const open = useCallback(
    ({ cols, rows }: { cols: number; rows: number }) =>
      spaceId
        ? invoker.invoke(SandboxOperation.OpenTerminal, { sandbox: Ref.make(sandbox), cols, rows }, { spaceId })
        : Effect.fail(new SandboxService.SandboxError({ message: 'Sandbox is not in a space.' })),
    [invoker, sandbox, spaceId],
  );

  return <SandboxTerminal role={role} open={open} />;
};
