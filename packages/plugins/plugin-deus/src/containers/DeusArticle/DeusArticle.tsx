//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { createDocAccessor } from '@dxos/echo-db';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  editorClassNames,
} from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { deus, mdlBlockDescription } from '../../extension';

import { Spec } from '#types';

export type DeusArticleProps = ObjectSurfaceProps<Spec.Spec>;

export const DeusArticle = forwardRef<HTMLDivElement, DeusArticleProps>(({ role, subject: spec }, forwardedRef) => {
  const { themeMode } = useThemeContext();
  const identity = useIdentity();
  const space = getSpace(spec);

  // Trigger re-render when the content ref resolves.
  useObject(spec.content);
  const target = spec.content.target;

  const extensions = useMemo(
    () =>
      [
        createBasicExtensions(),
        createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
        createThemeExtensions({ themeMode }),
        target &&
          createDataExtensions({
            id: spec.id,
            text: createDocAccessor(target, ['content']),
            messenger: space,
            identity,
          }),
        deus(),
      ].filter(isTruthy),
    [identity, space, spec.id, target, themeMode],
  );

  const { parentRef } = useTextEditor(
    () => ({
      initialValue: target?.content ?? '',
      extensions,
    }),
    [extensions],
  );

  return (
    <Panel.Root role={role} ref={forwardedRef}>
      <Panel.Content asChild>
        <div role='none' ref={parentRef} className={editorClassNames(role)} />
      </Panel.Content>
    </Panel.Root>
  );
});
