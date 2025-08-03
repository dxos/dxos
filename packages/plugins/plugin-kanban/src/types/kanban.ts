//
// Copyright 2024 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type JsonSchemaType } from '@dxos/echo-schema';
import { KanbanView } from '@dxos/react-ui-kanban';
import { type CreateViewFromSpaceProps, type DataType, ProjectionModel, createViewFromSpace } from '@dxos/schema';

type InitializeKanbanProps = Omit<CreateViewFromSpaceProps, 'presentation'> & {
  initialPivotColumn?: string;
};

export const createKanban = async ({
  initialPivotColumn,
  ...props
}: InitializeKanbanProps): Promise<{ jsonSchema: JsonSchemaType; view: DataType.View }> => {
  const kanban = Obj.make(KanbanView, { columnFieldId: undefined });
  const { jsonSchema, view } = await createViewFromSpace({ ...props, presentation: kanban });
  if (initialPivotColumn) {
    const projection = new ProjectionModel(jsonSchema, view.projection);
    const fieldId = projection.getFieldId(initialPivotColumn);
    if (fieldId) {
      kanban.columnFieldId = fieldId;
    }
  }

  return { jsonSchema, view };
};
