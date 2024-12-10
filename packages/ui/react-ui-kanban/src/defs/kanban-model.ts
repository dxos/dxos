//
// Copyright 2024 DXOS.org
//
import { signal } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { type JsonProp } from '@dxos/echo-schema';

import { type KanbanType } from './kanban';

export type BaseKanbanItem = Record<JsonProp, any> & { id: string };

export type KanbanModelProps = {
  kanban: KanbanType;
};

export class KanbanModel<T extends BaseKanbanItem = { id: string }> extends Resource {
  private readonly _kanban: KanbanType;
  private _items = signal<T[]>([]);

  constructor({ kanban }: KanbanModelProps) {
    super();
    this._kanban = kanban;
  }

  public setItems = (items: T[]): void => {
    this._items.value = items;
  };
}
