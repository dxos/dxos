//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { ObjectPicker } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

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
  // Whole-space query runs only while the popup is open so a mounted deck does not watch every object.
  const objects = useQuery(open ? Obj.getDatabase(presentation) : undefined, Filter.everything());
  const [sections] = useObject(presentation, 'sections');
  const candidates = useMemo(
    () =>
      TypeOptions.filterListedObjects(objects).filter(
        (object) => object.id !== presentation.id && !sections.some(Ref.hasEntityId(object.id)),
      ),
    [objects, sections, presentation],
  );
  const options = useMemo(
    () =>
      candidates
        .map((object) => {
          const typename = Obj.getTypename(object) ?? '';
          return {
            id: object.id,
            label:
              Obj.getLabel(object) ??
              t('untitled-object.label', {
                type: t('typename.label', { ns: typename, defaultValue: typename }) ?? typename,
              }) ??
              object.id,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [candidates, t],
  );

  const handleSelect = useCallback(
    (id: string | undefined) => {
      const object = candidates.find((candidate) => candidate.id === id);
      if (object) {
        Presentation.link(presentation, object);
      }
    },
    [candidates, presentation],
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
