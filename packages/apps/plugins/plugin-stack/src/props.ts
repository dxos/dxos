//
// Copyright 2023 DXOS.org
//

import { subscribe, ObservableArray } from '@dxos/observable-object';

export type StackSections = ObservableArray<StackSectionModel>;

export type StackSectionModel = {
  source: { resolver: string; guid: string };
  object: unknown;
};

export type StackModel = {
  id: string;
  sections: ObservableArray<StackSectionModel>;
};

export type StackProperties = {
  title?: string;
};

export const isStack = (datum: unknown): datum is StackModel =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      'sections' in datum &&
      Array.isArray(datum.sections) &&
      subscribe in datum.sections
    : false;

export const isStackProperties = (datum: unknown): datum is StackProperties =>
  datum && typeof datum === 'object' ? subscribe in datum : false;
