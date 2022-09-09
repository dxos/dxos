//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import faker from 'faker';
import { useEffect, useMemo, useState } from 'react';

import { EventEmitter } from '@dxos/gem-core';

import { ElementData, ElementDataType, ElementId, ElementType } from './element';

const log = debug('gem:canvas:model');

/**
 *
 */
// TODO(burdon): Replaces useSelection hook (i.e., requires database instance)? Or meta hook? Subscription?
export class ElementModel {
  subscription = new EventEmitter<ElementData<any>[]>();

  _elements = new Map<ElementId, ElementData<any>>();

  constructor (elements: ElementData<any>[] = []) {
    elements.forEach(element => this._elements.set(element.id, element));
  }

  get elements () {
    return Array.from(this._elements.values());
  }

  async create (type: ElementType, data: ElementDataType): Promise<ElementData<any>> {
    const element = {
      id: faker.datatype.uuid(),
      type,
      data
    };

    this._elements.set(element.id, element);
    log('created', JSON.stringify(element));
    this.subscription.emit(Array.from(this._elements.values()));
    return element;
  }

  async update (element: ElementData<any>): Promise<ElementData<any>> {
    this._elements.set(element.id, { ...element });
    log('updated', JSON.stringify(element));
    this.subscription.emit(Array.from(this._elements.values()));
    return element;
  }

  async delete (id: ElementId): Promise<ElementId> {
    const deleted = [id];

    // Remove lines connected to element.
    this._elements.forEach(element => {
      if (element.type === 'line' && (element.data.source.id === id || element.data.target.id === id)) {
        deleted.push(element.id);
      }
    });

    deleted.forEach(id => this._elements.delete(id));
    log('deleted', deleted);
    this.subscription.emit(Array.from(this._elements.values()));
    return id;
  }
}

export const useMemoryElementModel = (provider?: () => ElementData<any>[]): [ElementData<any>[], ElementModel] => {
  const model = useMemo(() => new ElementModel(provider?.()), []);
  const [elements, setElements] = useState<ElementData<any>[]>([]);
  useEffect(() => {
    setElements(model.elements);
    return model.subscription.on(elements => {
      setElements(elements);
    });
  }, [model]);

  return [elements, model];
};
