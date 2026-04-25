//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { AtomRef } from '@dxos/echo-atom';
import { createDocAccessor } from '@dxos/echo-db';
import { Input, useTranslation } from '@dxos/react-ui';
import { Editor, useBasicMarkdownExtensions } from '@dxos/react-ui-editor';
import { createDataExtensions } from '@dxos/ui-editor';

import { meta } from '#meta';
import { type Magazine } from '#types';

/** Props for the {@link MagazineProperties} object-properties surface. */
export type MagazinePropertiesProps = AppSurface.ObjectPropertiesProps<Magazine.Magazine>;

/**
 * Object-properties surface for {@link Magazine.Magazine}: edits the long-form
 * `instructions` Text (`magazine.instructions.target.content`) inline as markdown.
 * The `instructions` field is hidden from the auto-generated form via
 * `FormInputAnnotation.set(false)`, so this surface owns its rendering.
 */
export const MagazineProperties = ({ subject: magazine }: MagazinePropertiesProps) => {
  const { t } = useTranslation(meta.id);
  const instructions = useAtomValue(AtomRef.make(magazine.instructions));
  const dataExtensions = useMemo(
    () =>
      instructions
        ? [createDataExtensions({ id: magazine.id, text: createDocAccessor(instructions, ['content']) })]
        : [],
    [instructions, magazine.id],
  );
  const extension = useBasicMarkdownExtensions({
    placeholder: t('instructions.placeholder'),
    extensions: dataExtensions,
  });

  return (
    <div role='none' className='dx-expander flex flex-col'>
      <Input.Root>
        <Input.Label classNames='mt-form-gap'>{t('instructions.label')}</Input.Label>
        {instructions && (
          <Editor.Root>
            <Editor.View
              classNames='bg-input-surface border border-separator rounded-xs p-1 px-2'
              extensions={extension}
            />
          </Editor.Root>
        )}
      </Input.Root>
    </div>
  );
};
