//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, memo, type Ref } from 'react';

import { YXmlFragment } from '@dxos/text-model';

import { type ComposerSlots, useTextModel, type UseTextModelOptions } from '../../model';
import { MarkdownComposer, type MarkdownComposerRef } from '../Markdown';
import { RichTextComposer, type TipTapEditor } from '../RichText';

export type ComposerProps = UseTextModelOptions & {
  slots?: ComposerSlots;
};

/**
 * Memoized composer which depends DXOS platform.
 *
 * Determines which composer to render based on the kind of text.
 */
// NOTE: Without `memo`, if parent component uses `observer` the composer re-renders excessively.
// TODO(wittjosiah): Factor out?
export const Composer = memo(
  forwardRef<TipTapEditor | MarkdownComposerRef, ComposerProps>(({ slots, ...options }, forwardedRef) => {
    const model = useTextModel(options);
    if (model?.content instanceof YXmlFragment) {
      return <RichTextComposer ref={forwardedRef as Ref<TipTapEditor>} model={model} slots={slots} />;
    } else {
      return <MarkdownComposer ref={forwardedRef as Ref<MarkdownComposerRef>} model={model} slots={slots} />;
    }
  }),
);
