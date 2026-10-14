//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Operation from '@dxos/compute/Operation';
import { JsonView, Placeholder, Searchbar } from '@dxos/devtools';
import { Entity, Format, Obj, Type } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { DynamicTable, type TableFeatures } from '@dxos/react-ui-table';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

type RegistryRow = {
  id: string;
  kind: string;
  label: string;
  _entity: Entity.Unknown;
};

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  const matcher = new RegExp(text, 'i');
  return (entity: Entity.Unknown) => {
    const typename = Entity.getTypename(entity) ?? '';
    const metaKey = Obj.isObject(entity) ? (Obj.getMeta(entity).key ?? '') : '';
    const uri = Type.isType(entity) ? (Type.getURI(entity)?.toString() ?? '') : '';
    const operationKey =
      Obj.isObject(entity) && Obj.instanceOf(Operation.PersistentOperation, entity)
        ? (Operation.getKey(entity) ?? '')
        : '';
    const name = Obj.isObject(entity) && Obj.instanceOf(Operation.PersistentOperation, entity) ? entity.name : '';
    return [typename, metaKey, uri, operationKey, name, getEntityId(entity)].some((value) => value.match(matcher));
  };
};

const getEntityId = (entity: Entity.Unknown): string => {
  if (entity.id) {
    return entity.id;
  }
  if (Type.isType(entity)) {
    return Type.getURI(entity)?.toString() ?? Type.getTypename(entity) ?? 'unknown-type';
  }
  return Entity.getTypename(entity) ?? 'unknown';
};

const getKind = (entity: Entity.Unknown): string => {
  if (Type.isType(entity)) {
    return 'type';
  }
  if (Obj.isObject(entity) && Obj.instanceOf(Operation.PersistentOperation, entity)) {
    return 'operation';
  }
  return 'other';
};

const getLabel = (entity: Entity.Unknown): string => {
  if (Obj.isObject(entity) && Obj.instanceOf(Operation.PersistentOperation, entity)) {
    return entity.name || Operation.getKey(entity) || getEntityId(entity);
  }
  if (Type.isType(entity)) {
    return Type.getTypename(entity) ?? getEntityId(entity);
  }
  return getEntityId(entity);
};

const toDetailJson = (entity: Entity.Unknown): object => {
  if (Type.isType(entity)) {
    return {
      id: getEntityId(entity),
      typename: Type.getTypename(entity),
      uri: Type.getURI(entity)?.toString(),
      version: Type.getVersion(entity),
      jsonSchema: entity.jsonSchema,
    };
  }
  if (Obj.isObject(entity)) {
    return Obj.toJSON(entity);
  }
  return { id: getEntityId(entity), typename: Entity.getTypename(entity) };
};

export const RegistryArticle = ({ role }: { role?: string }) => {
  const client = useClient();
  const [entities, setEntities] = useState<Entity.Unknown[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Entity.Unknown>();

  useEffect(() => {
    const registry = client.graph.registry;
    const refresh = () => setEntities([...registry.list()]);
    refresh();
    return registry.changed.on(refresh);
  }, [client]);

  const properties = useMemo(
    () => [
      { name: 'kind', format: Format.TypeFormat.String, size: 100 },
      { name: 'label', format: Format.TypeFormat.String },
      { name: 'id', format: Format.TypeFormat.String, size: 280 },
    ],
    [],
  );

  const rows = useMemo((): RegistryRow[] => {
    return entities
      .filter(textFilter(filter))
      .map((entity) => ({
        id: getEntityId(entity),
        kind: getKind(entity),
        label: getLabel(entity),
        _entity: entity,
      }))
      .toSorted((left, right) => left.label.localeCompare(right.label));
  }, [entities, filter]);

  const handleRowClicked = useCallback((row: RegistryRow | undefined) => {
    if (!row?._entity) {
      return;
    }
    setSelected(row._entity);
  }, []);

  const detailJson = useMemo(() => (selected ? toDetailJson(selected) : undefined), [selected]);

  const features: Partial<TableFeatures> = useMemo(() => ({ selection: { enabled: true, mode: 'single' } }), []);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          <Searchbar placeholder='Filter...' onChange={setFilter} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Layout.Grid cols={[2, 1]} classNames='overflow-hidden'>
          <Layout.Flex column classNames='dx-grow overflow-hidden'>
            <DynamicTable properties={properties} rows={rows} features={features} onRowClick={handleRowClicked} />
          </Layout.Flex>
          <div className='h-full overflow-auto border-s border-separator text-sm'>
            {detailJson ? <JsonView data={detailJson} /> : <Placeholder label='Details' />}
          </div>
        </Layout.Grid>
      </Panel.Body>
    </Panel.Root>
  );
};

RegistryArticle.displayName = 'RegistryArticle';
