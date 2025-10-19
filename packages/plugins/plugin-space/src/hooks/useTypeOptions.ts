//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { DataType, type TypenameAnnotation, getTypenames } from '@dxos/schema';

import { SpaceCapabilities } from '../capabilities';

const OMIT = [DataType.Collection.typename, Type.getTypename(DataType.QueryCollection)];

export const useTypeOptions = ({ space, annotation }: { space?: Space; annotation: TypenameAnnotation[] }) => {
  const { t } = useTranslation();
  const client = useClient();

  const schemaWhitelists = useCapabilities(ClientCapabilities.SchemaWhiteList);
  const whitelistedTypenames = useMemo(
    () => new Set(schemaWhitelists.flatMap((typeArray) => typeArray.map((type) => Type.getTypename(type)))),
    [schemaWhitelists],
  );

  const objectForms = useCapabilities(SpaceCapabilities.ObjectForm);
  const objectFormTypenames = useMemo(
    () =>
      new Set(
        objectForms
          .map((form) => Type.getTypename(form.objectSchema))
          // TODO(wittjosiah): Remove.
          .filter((typename) => !OMIT.includes(typename) && !typename.endsWith('View')),
      ),
    [objectForms],
  );

  const typenames = getTypenames({
    annotation,
    whitelistedTypenames,
    objectFormTypenames,
    space,
    client,
  });

  return useMemo(
    () =>
      typenames
        .map((typename) => ({
          value: typename,
          label: t('typename label', { ns: typename, defaultValue: typename }),
        }))
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [t, typenames],
  );
};
