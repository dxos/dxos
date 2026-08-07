//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { type Type } from '@dxos/echo';
import { Card, Panel, ScrollArea } from '@dxos/react-ui';
import { ObjectForm } from '@dxos/react-ui-form';

import type * as SpaceCapabilities from '../../types/SpaceCapabilities';

export type MergePreviewProps = {
  type: Type.AnyEntity;
  preview: SpaceCapabilities.MergePreview;
};

/**
 * Companion view of a staged merge: an editable form over the *detached* merged object. Edits
 * mutate the detached preview, so they flow into the overrides when the merge commits — Confirm
 * and Cancel live in the TypeArticle toolbar that staged the preview.
 */
export const MergePreview = forwardRef<HTMLDivElement, MergePreviewProps>(({ type, preview }, forwardedRef) => (
  <Panel.Root ref={forwardedRef}>
    <Panel.Content asChild>
      <ScrollArea.Root orientation='vertical' centered>
        <ScrollArea.Viewport>
          <Card.Root fullWidth classNames='pb-form-gap'>
            <ObjectForm object={preview.preview} type={type} />
          </Card.Root>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Content>
  </Panel.Root>
));

MergePreview.displayName = 'MergePreview';
