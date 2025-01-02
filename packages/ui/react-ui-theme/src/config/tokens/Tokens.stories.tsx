//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import { facetSemanticValues, type Facet, resolveNaming, seriesValues, renderHelicalArcTokens } from '@ch-ui/tokens';
import { type Meta } from '@storybook/react';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { tokenSet } from './index';

const semanticValues = facetSemanticValues((tokenSet.colors as Facet).semantic);
const mainCondition = 'p3';

const structure = Object.entries(tokenSet.colors.physical.series)
  .map(([seriesId, { [mainCondition]: series }]) => {
    const resolvedNaming = resolveNaming(series?.naming as any);
    const values = seriesValues(series!, Array.from(semanticValues?.[seriesId] ?? []));
    return [
      seriesId,
      renderHelicalArcTokens({
        seriesId,
        conditionId: mainCondition,
        series: series as any,
        namespace: tokenSet.colors.physical.namespace,
        resolvedNaming,
        values,
      }).map((declaration) => declaration.split(':')[0]),
    ];
  })
  .reverse();

const Swatch = ({ variable }: { variable: string }) => {
  return (
    <div className='inline-block is-16'>
      <dd className='aspect-square' style={{ background: `var(${variable})` }}></dd>
      <dt>{variable.substring(tokenSet.colors.physical.namespace!.length + 2)}</dt>
    </div>
  );
};

export const Tokens = () => {
  return structure.map(([seriesId, variables]) => {
    return (
      <>
        <h2>{seriesId}</h2>
        <dl>
          {(variables as string[]).map((variable) => (
            <Swatch key={variable} variable={variable} />
          ))}
        </dl>
      </>
    );
  });
};

const meta: Meta = {
  title: 'ui/react-ui-theme/Tokens',
  decorators: [withTheme],
};

export default meta;
