//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type PropsWithChildren, useCallback } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Doc } from '@dxos/echo-doc';
import { type EditorExtensionsFactory, EditorExtensionsProvider } from '@dxos/react-ui-editor';

import { CommentCapabilities } from '#types';

import { commentSync } from '../extensions/index.ts';
import { ReviewNamespace } from '../namespace.ts';
import { findCommentConfig } from '../util/commentable.ts';

/** Comments in every live-bound field editor of an object whose type takes anchored comments. */
const CommentExtensionsProvider = ({ children }: PropsWithChildren) => {
  const invoker = Hooks.useOptionalCapability(Capabilities.OperationInvoker);
  const registry = Hooks.useOptionalCapability(Capabilities.AtomRegistry);
  const stateAtom = Hooks.useOptionalCapability(CommentCapabilities.State);
  const configs = Hooks.useOptionalCapabilities(AppCapabilities.CommentConfig);
  const extensions = useCallback<EditorExtensionsFactory>(
    ({ object, path, anchor }) =>
      registry && stateAtom && findCommentConfig(configs, object)?.comments === 'anchored'
        ? commentSync(
            { registry, stateAtom },
            { subject: object, accessor: Doc.createAccessor(object, [...path]), path: anchor ?? path },
            invoker?.invokePromise,
          )
        : [],
    [invoker, registry, stateAtom, configs],
  );

  return <EditorExtensionsProvider extensions={extensions}>{children}</EditorExtensionsProvider>;
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactContext, {
      id: `${ReviewNamespace.key}.editor-extensions`,
      context: CommentExtensionsProvider,
    }),
  ),
);
