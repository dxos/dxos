//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback } from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';

import { Spec } from '#types';

export type SpecArticleProps = ObjectSurfaceProps<Spec.Spec>;

export const SpecArticle = forwardRef<HTMLDivElement, SpecArticleProps>(
  ({ role, subject: spec, attendableId }, forwardedRef) => {
    const [content, setContent] = useObject(spec.content, 'content');

    const handleChange = useCallback(
      (value: string) => {
        setContent(value);
      },
      [setContent],
    );

    return (
      <Editor.Root>
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Content>
            <Editor.Content value={content ?? ''} onChange={handleChange} />
          </Panel.Content>
        </Panel.Root>
      </Editor.Root>
    );
  },
);
