//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

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
  const db = Obj.getDatabase(presentation);
  // Queried while mounted rather than on open: results landing while the user types reset the popup's query.
  const objects = useQuery(db, Filter.everything());
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
        .map((object) => ({ id: object.id, label: Obj.getLabel(object) ?? object.id }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [candidates],
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
