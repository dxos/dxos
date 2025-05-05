//
// Copyright 2023 DXOS.org
//

export type Generator<Subject> = (subject: Subject) => string;

export type PropertyType = {
  array?: boolean;
  entity?: string;
};

export type Property<Subject> = {
  key: string;
  type?: PropertyType;
  // TODO(burdon): Multiple; specify service type.
  resolver?: Generator<Subject>;
};

export type Schema<Subject> = Property<Subject>[];

export type SchemaMap = { [key: string]: Schema<any> };

export type Entity = {
  entity: string;
  values: { [property: string]: any };
};
