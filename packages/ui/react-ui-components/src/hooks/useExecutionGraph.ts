//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { ExecutionGraph } from '@dxos/assistant';
import { Filter } from '@dxos/echo';
import { type Queue, useQuery } from '@dxos/react-client/echo';

/**
 * Stable sort: objects with 'created' field are sorted by it, others remain in place.
 */
const sortObjectsByCreated = (objects: any[]) => {
  const sortedObjects = objects.slice();
  // Find indices of objects with 'created'
  const createdObjects: { idx: number; obj: any }[] = [];
  sortedObjects.forEach((obj, idx) => {
    if (obj && typeof obj.created === 'string') {
      createdObjects.push({ idx, obj });
    }
  });
  // Sort only the objects with 'created' by their date, stable
  createdObjects.sort((a, b) => {
    const aDate = new Date(a.obj.created).getTime();
    const bDate = new Date(b.obj.created).getTime();
    return aDate - bDate;
  });
  // Place sorted createdObjects back into their original positions
  let createdIdx = 0;
  return sortedObjects.map((obj, _idx) => {
    if (obj && typeof obj.created === 'string') {
      return createdObjects[createdIdx++].obj;
    }
    return obj;
  });
};

export const useExecutionGraph = (queueRef?: Queue, lastRequest = false) => {
  const objects = useQuery(queueRef, Filter.everything());
  return useMemo(() => {
    const graph = new ExecutionGraph();
    const sortedObjects = sortObjectsByCreated(objects);
    graph.addEvents(sortedObjects);
    return graph.getGraph(lastRequest);
  }, [objects, lastRequest]);
};
