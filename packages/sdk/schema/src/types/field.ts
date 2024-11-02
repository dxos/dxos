//
// Copyright 2024 DXOS.org
//

import { AST, deleteProperty, type JsonPath, getAnnotation, setAnnotation } from '@dxos/echo-schema';

import { type FieldType, type FieldPropertiesType, type ViewType } from './view';

/**
 * Maps view fields and schema annotations onto in-memory projections used by UX components.
 */
export class FieldProjection {
  constructor(private readonly _annotationIds: symbol[] = [AST.TitleAnnotationId, AST.DescriptionAnnotationId]) {}

  getFieldProperties(view: ViewType, path: JsonPath): [FieldType, FieldPropertiesType] {
    const field = view.fields.find((f) => f.path === path) ?? { path };

    // TODO(burdon): Mixin properties from all annotations.
    const properties: FieldPropertiesType = { path };
    for (const annotationId of this._annotationIds) {
      (properties as any)[annotationId] = getAnnotation(view.schema, path, annotationId);
    }

    return [field, properties];
  }

  // TODO(burdon): Re-order.
  setFieldProperties(view: ViewType, field: FieldType, properties: FieldPropertiesType) {
    const current = view.fields.find((f) => f.path === field.path);
    if (!current) {
      view.fields.push(field);
    } else {
      Object.assign(current, field);
    }

    for (const annotationId of this._annotationIds) {
      const value = (properties as any)[annotationId];
      setAnnotation(view.schema, field.path, { [annotationId]: value });
    }
  }

  deleteField(view: ViewType, field: FieldType) {
    const idx = view.fields.findIndex((f) => f.path === field.path);
    if (idx !== -1) {
      view.fields.splice(idx, 1);
      deleteProperty(view.schema, field.path);
    }
  }
}
