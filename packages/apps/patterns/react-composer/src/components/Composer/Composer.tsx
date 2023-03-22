//
// Copyright 2023 DXOS.org
//

import React, { memo } from 'react';

import { YXmlFragment } from '@dxos/text-model';

import { ComposerSlots, useTextModel, UseTextModelOptions } from '../../model';
import { MarkdownComposer } from '../Markdown';
import { RichTextComposer } from '../RichText';

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
export const Composer = memo(({ slots, ...options }: ComposerProps) => {
  const model = useTextModel(options);

  if (model?.content instanceof YXmlFragment) {
    return <RichTextComposer model={model} slots={slots} />;
  } else {
    return <MarkdownComposer model={model} slots={slots} />;
  }
});
