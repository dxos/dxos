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

type SwatchProps = { variable: string; seriesId: string; shadeValue: number; opacity: number; name: string };

const Swatch = ({ variable, seriesId, shadeValue, opacity, name }: SwatchProps) => {
  return (
    <div className='shrink-0 is-16'>
      <dd className='aspect-square' style={{ background: `var(${variable})` }}></dd>
      <dt className='text-xs'>
        <p>{seriesId}</p>
        <p>{shadeValue}</p>
        {opacity < 1 && <p>{opacity}</p>}
      </dt>
    </div>
  );
};

export const Audit = () => {
  return (
    <>
      <h1>Physical tokens</h1>
      {structure.map(([seriesId, variables]) => {
        const swatches = (variables as string[])
          .map((variable) => {
            const name = variable.substring(tokenSet.colors.physical.namespace!.length + 2);
            const results = name.split(/-|\\\/\\/);
            const [seriesId, shadeValue, opacity] = results;
            return {
              seriesId,
              shadeValue: parseFloat(shadeValue),
              opacity: opacity ? parseFloat(opacity) : 1,
              name,
              variable,
            };
          })
          .sort((a, b) => {
            return a.shadeValue - b.shadeValue - (a.opacity - b.opacity);
          });
        return (
          <>
            <h2 className='mbs-4 mbe-2'>{seriesId}</h2>
            <dl className='flex flex-wrap'>
              {swatches.map((swatch) => (
                <Swatch key={swatch.variable} {...swatch} />
              ))}
            </dl>
          </>
        );
      })}
    </>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-theme/Tokens',
  decorators: [withTheme],
};

export default meta;
