//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { ViewEditor, useSchemaResolver } from '@dxos/react-ui-data';
import { type ViewType } from '@dxos/schema';

const TableViewEditor = ({ view }: { view: ViewType }) => {
  const resolver = useSchemaResolver();
  if (!resolver) {
    return null;
  }

  return (
    <div>
      <ViewEditor schemaResolver={resolver} view={view} />
    </div>
  );
};

export default TableViewEditor;