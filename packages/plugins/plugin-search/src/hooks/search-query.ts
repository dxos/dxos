//
// Copyright 2026 DXOS.org
//

import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { Entity, Obj } from '@dxos/echo';
import { type SearchResult } from '@dxos/react-ui-search';
import { Text } from '@dxos/schema';

import { mapObjectToTextFields } from './sync.ts';

/** Fallback for a type that declares no `IconAnnotation` - the same one the nav tree and cards use. */
const DEFAULT_ICON = 'ph--circle-dashed--regular';

/**
 * Map FTS-matched ECHO objects to ranked search results. Text objects are dropped
 * (they carry no independent label and are indexed via their host object).
 */
export const toSearchResults = <T extends Entity.Unknown>(objects: T[], text: string): SearchResult<T>[] => {
  const results = objects.reduce<SearchResult<T>[]>((acc, object) => {
    if (Obj.instanceOf(Text.Text, object)) {
      return acc;
    }
    const label = Entity.getLabel(object);
    // TODO(burdon): Use schema for the snippet too (mapObjectToTextFields flattens every string prop).
    const fields = mapObjectToTextFields(object);
    const snippet = fields.content ?? fields.description ?? Object.values(fields).find((value) => value !== label);
    acc.push({
      id: object.id,
      // Always set, so a row without a type-declared icon still aligns with the rest.
      icon: Entity.getIcon(object)?.icon ?? DEFAULT_ICON,
      label,
      snippet,
      object,
    });
    return acc;
  }, []);
  return results.sort(ObjectCombobox.byRelevance(text));
};
