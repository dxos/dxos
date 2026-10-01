//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { type Type } from '@dxos/echo';
import { ObjectForm } from '@dxos/react-ui-form/next';
import { Next } from '@dxos/react-ui/next';

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
  <Next.Panel.Root ref={forwardedRef}>
    <Next.Panel.Body asChild>
      <Next.ScrollArea.Root orientation='vertical' centered>
        <Next.ScrollArea.Viewport>
          <Next.Card.Root fullWidth classNames='pb-form-gap'>
            <ObjectForm object={preview.preview} type={type} />
          </Next.Card.Root>
        </Next.ScrollArea.Viewport>
      </Next.ScrollArea.Root>
    </Next.Panel.Body>
  </Next.Panel.Root>
));

MergePreview.displayName = 'MergePreview';
