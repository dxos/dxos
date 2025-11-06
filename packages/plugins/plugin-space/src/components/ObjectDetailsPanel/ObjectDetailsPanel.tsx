//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { Callout, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { type View } from '@dxos/schema';
import { getTypenameFromQuery } from '@dxos/schema';
import { type View } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

import { ObjectForm } from './ObjectForm';

type RowDetailsPanelProps = { objectId: string; view: View.View };

export const ObjectDetailsPanel = ({ objectId, view }: RowDetailsPanelProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const space = getSpace(view);
  const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(client, space, typename);

  const queriedObjects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const selectedRows = useSelected(objectId, 'multi');
  const selectedObjects = selectedRows.map((id) => queriedObjects.find((obj) => obj.id === id)).filter(isNonNullable);

  if (selectedObjects.length === 0) {
    return (
      <div role='none' className='plb-cardSpacingBlock pli-cardSpacingInline'>
        <Callout.Root classNames='is-full'>
          <Callout.Title>{t('row details no selection label')}</Callout.Title>
        </Callout.Root>
      </div>
    );
  }

  return (
    <div role='none' className='bs-full is-full flex flex-col p-2 gap-1 overflow-y-auto'>
      {schema &&
        selectedObjects.map((object) => (
          <div key={object.id} className='border border-separator rounded'>
            <ObjectForm object={object} schema={schema} />
          </div>
        ))}
    </div>
  );
};
