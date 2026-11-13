//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { ObjectPicker } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { useObjectOptions, usePresentationDeck } from '#hooks';
import { Presentation } from '#types';

import { PresenterNamespace } from '../../namespace.ts';

export type SectionPickerProps = {
  presentation: Presentation.Presentation;
};

/**
 * Toolbar button that picks a listed object from the presentation's space and links it as a new section.
 */
export const SectionPicker = ({ presentation }: SectionPickerProps) => {
  const { t } = Hooks.useTranslation(PresenterNamespace.key);
  const [open, setOpen] = useState(false);
  // Objects a slide already shows are not offered again.
  const slides = usePresentationDeck(presentation);
  const linked = useMemo(
    () => new Set(slides.flatMap((slide) => (slide.kind === 'object' ? [slide.object.id] : []))),
    [slides],
  );
  const include = useCallback(
    (object: Obj.Unknown) => object.id !== presentation.id && !linked.has(object.id),
    [presentation, linked],
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
