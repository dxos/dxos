//
// Copyright 2024 DXOS.org
//

import { loadObjectReferences } from '@dxos/client/echo';
import { type EchoReactiveObject } from '@dxos/echo-schema';

import { EventType } from './calendar';
import { ChainType } from './chain';
import { CollectionType } from './collection';
import { DiagramType } from './diagram';
import { DocumentType } from './document';
import { GridItemType, GridType } from './grid';
import { KanbanColumnType, KanbanItemType, KanbanType } from './kanban';
import { ScriptType } from './script';
import { TableType } from './table';
import { ChannelType, MessageType, ThreadType } from './thread';
import { TreeItemType, TreeType } from './tree';

/**
 * @deprecated This is a temporary solution.
 */
export const getNestedObjects = async (object: EchoReactiveObject<any>): Promise<EchoReactiveObject<any>[]> => {
  const objects: EchoReactiveObject<any>[] = await loadReferences(object);
  const nested = await Promise.all(objects.map((object) => getNestedObjects(object)));
  return [...objects, ...nested.flat()];
};

const loadReferences = (object: EchoReactiveObject<any>) => {
  if (object instanceof EventType) {
    return loadObjectReferences(object, (event) => event.links);
  } else if (object instanceof ChainType) {
    return loadObjectReferences(object, (chain) => chain.prompts);
  } else if (object instanceof CollectionType) {
    return loadObjectReferences(object, (collection) => [...collection.objects, ...Object.values(collection.views)]);
  } else if (object instanceof DiagramType) {
    return loadObjectReferences(object, (diagram) => [diagram.canvas]);
  } else if (object instanceof DocumentType) {
    return loadObjectReferences(object, (document) => [document.content, ...document.threads]);
  } else if (object instanceof GridType) {
    return loadObjectReferences(object, (grid) => grid.items);
  } else if (object instanceof GridItemType) {
    // return loadObjectReferences(object, (item) => [item.object]);
    return [];
  } else if (object instanceof KanbanType) {
    return loadObjectReferences(object, (kanban) => kanban.columns);
  } else if (object instanceof KanbanColumnType) {
    return loadObjectReferences(object, (column) => column.items);
  } else if (object instanceof KanbanItemType) {
    // return loadObjectReferences(object, (item) => [item.object]);
    return [];
  } else if (object instanceof ScriptType) {
    return loadObjectReferences(object, (script) => [script.source]);
  } else if (object instanceof TableType) {
    return loadObjectReferences(object, (table) => [table.schema]);
  } else if (object instanceof ChannelType) {
    return loadObjectReferences(object, (channel) => channel.threads);
  } else if (object instanceof ThreadType) {
    return loadObjectReferences(object, (thread) => thread.messages);
  } else if (object instanceof MessageType) {
    // return loadObjectReferences(object, (message) => [...message.parts, message.context]);
    return [];
  } else if (object instanceof TreeType) {
    return loadObjectReferences(object, (tree) => [tree.root]);
  } else if (object instanceof TreeItemType) {
    return loadObjectReferences(object, (item) => item.items);
  } else {
    return [];
  }
};
