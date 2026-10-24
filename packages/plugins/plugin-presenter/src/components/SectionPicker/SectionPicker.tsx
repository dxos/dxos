//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { ObjectPicker } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { useObjectOptions } from '#hooks';
import { meta } from '#meta';
import { Presentation } from '#types';

export type SectionPickerProps = {
  presentation: Presentation.Presentation;
};

/**
 * Toolbar button that picks a listed object from the presentation's space and links it as a new section.
 */
export const SectionPicker = ({ presentation }: SectionPickerProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [open, setOpen] = useState(false);
  const [sections] = useObject(presentation, 'sections');
  const include = useCallback(
    (object: Obj.Unknown) => object.id !== presentation.id && !sections.some(Ref.hasEntityId(object.id)),
    [presentation, sections],
  );
  const options = useObjectOptions(open ? Obj.getDatabase(presentation) : undefined, include);

  const handleSelect = useCallback(
    (id: string | undefined) => {
      const option = options.find((candidate) => candidate.id === id);
      if (option) {
        Presentation.link(presentation, option.object);
      }
    },
    [options, presentation],
  );

  return (
    <ObjectPicker
      options={options}
      onSelect={handleSelect}
      onOpenChange={setOpen}
      trigger={
        <Button.Root
          data-testid='presenter.section-picker'
          icon='ph--link-simple--regular'
          iconOnly
          variant='ghost'
          label={t('add-section.label')}
        />
      }
    />
  );
};
