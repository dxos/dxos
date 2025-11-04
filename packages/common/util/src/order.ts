//
// Copyright 2023 DXOS.org
//

export type IdOrder = string[];

type ObjectOrderAccumulator<T> = { objects: T[]; ids: Set<string> };

/**
 * Uses an array of string id’s to order a map of objects, returning an array of those objects. Objects not listed by
 * the array of id’s occur later in the resulting array of objects based on the map’s key order.
 * @param objectMap
 * @param order
 */
export const inferObjectOrder = <T = any>(objectMap: Record<string, T>, order: IdOrder = []): T[] => {
  const orderedObjects = order.reduce(
    (acc, id) => {
      if (id in objectMap) {
        acc.objects.push(objectMap[id]);
        acc.ids.add(id);
      }
      return acc;
    },
    { objects: [], ids: new Set() } as ObjectOrderAccumulator<T>,
  );
  const { objects } = Object.keys(objectMap).reduce((acc, id) => {
    if (!acc.ids.has(id)) {
      acc.objects.push(objectMap[id]);
    }
    return acc;
  }, orderedObjects);
  return objects;
};

/**
 * Uses an array of string id’s to order a map of objects, returning a new map with the keys in the prescribed order.
 * Objects not listed by the array of id’s occur later in the resulting array of objects based on the map’s key order.
 * @param objectMap
 * @param order
 */
export const inferRecordOrder = <T = any>(objectMap: Record<string, T>, order: IdOrder = []): Record<string, T> =>
  Object.assign(
    order
      .filter((id) => id in objectMap)
      .reduce((acc: Record<string, null>, id) => {
        acc[id] = null;
        return acc;
      }, {}),
    objectMap,
  );
