//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Prompt } from '@dxos/blueprints';
import { Filter } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';

export const PromptModule = ({ space }: { space: Space }) => {
  const [prompt] = useQuery(space, Filter.type(Prompt.Prompt));
  const data = useMemo(() => ({ subject: prompt }), [prompt]);
  return <Surface role='article' limit={1} data={data} />;
};
