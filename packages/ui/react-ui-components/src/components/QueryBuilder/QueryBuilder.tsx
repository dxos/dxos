//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Filter, type Tag, type TagMap, createTagList } from '@dxos/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Picker } from './Picker';

export type QueryBuilderProps = ThemedClassName<{
  types?: { id: string; label: string }[];
  tags?: Tag[];
  onFilterChange?: (filter: Filter.Any | null) => void;
}>;

export const QueryBuilder = ({ classNames, types, tags, onFilterChange }: QueryBuilderProps) => {
  const [type, setType] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    const typeFilter = type ? Filter.type(type) : null;
    const tagFilter = tag ? Filter.tag(tag) : null;
    onFilterChange?.(typeFilter && tagFilter ? Filter.and(typeFilter, tagFilter) : typeFilter || tagFilter || null);
  }, [type, tag, onFilterChange]);

  return (
    <div className={mx('grid grid-cols-2 gap-2', classNames)}>
      {types && <Picker placeholder='Type' values={types} value={type} onChange={setType} />}
      {tags && <Picker placeholder='Tag' values={tags} value={tag} onChange={setTag} />}
    </div>
  );
};
