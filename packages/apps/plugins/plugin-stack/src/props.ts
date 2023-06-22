//
// Copyright 2023 DXOS.org
//

import { subscribe, ObservableArray } from '@dxos/observable-object';

export type StackSections = ObservableArray<StackSectionModel<any>>;

export type StackObject = { id: string };

export type GenericStackObject = StackObject & { [key: string]: any };

export type StackSectionModel<T extends StackObject = GenericStackObject> = {
  source: { resolver: string; guid: string };
  object: T;
};

export type StackModel<T extends StackObject = GenericStackObject> = {
  id: string;
  sections: ObservableArray<StackSectionModel<T>>;
};

export type StackProperties = {
  title?: string;
};

export const isStack = <T extends StackObject = GenericStackObject>(datum: unknown): datum is StackModel<T> =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      'sections' in datum &&
      Array.isArray(datum.sections) &&
      subscribe in datum.sections
    : false;

export const isStackProperties = (datum: unknown): datum is StackProperties =>
  datum && typeof datum === 'object' ? subscribe in datum : false;
