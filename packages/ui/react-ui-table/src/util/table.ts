//
// Copyright 2024 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type JsonSchemaType } from '@dxos/echo-schema';
import { type CreateViewFromSpaceProps, type DataType, createViewFromSpace } from '@dxos/schema';

import { TableView } from '../types';

type CreateTableProps = Omit<CreateViewFromSpaceProps, 'presentation'> & {
  name?: string;
};

export const createTable = ({
  name,
  ...props
}: CreateTableProps): Promise<{ jsonSchema: JsonSchemaType; view: DataType.View }> => {
  return createViewFromSpace({ ...props, presentation: Obj.make(TableView, { name, sizes: {} }) });
};
