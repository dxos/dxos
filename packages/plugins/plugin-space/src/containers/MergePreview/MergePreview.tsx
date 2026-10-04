//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { type Type } from '@dxos/echo';
import { Card, Panel, ScrollArea } from '@dxos/react-ui';
import { ObjectForm } from '@dxos/react-ui-form';

import { SpaceCapabilities } from '#types';

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
    <Panel.Body asChild>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport>
          <Card.Root classNames='pb-form-gap'>
            <ObjectForm object={preview.preview} type={type} />
          </Card.Root>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  </Panel.Root>
));

MergePreview.displayName = 'MergePreview';
