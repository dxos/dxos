//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import { auditFacet, type HelicalArcSeries, type TokenAudit, parseAlphaLuminosity } from '@ch-ui/tokens';
import { type Meta } from '@storybook/react';
import React from 'react';

import { tokenSet } from './index';

const colorAudit = auditFacet(tokenSet.colors, { condition: 'p3' });

const Swatch = ({ variableName, value, semantic, physical }: TokenAudit<HelicalArcSeries>) => {
  const [luminosity, alpha] = parseAlphaLuminosity(value);
  return (
    <div className='shrink-0 is-32'>
      <dd className='aspect-video' style={{ background: `var(${variableName})` }}></dd>
      <dt className='text-xs'>
        <p>
          {luminosity}
          {typeof alpha !== 'undefined' && ` / ${alpha}`}
        </p>
        {physical.includes('values') && <p>values</p>}
        {physical.includes('naming') && <p>naming</p>}
        {semantic.length > 0 && (
          <ul>
            {semantic.map(({ sememeName, conditionId }) => {
              const sememeCondition = `${sememeName} / ${conditionId}`;
              return <li key={sememeCondition}>{sememeCondition}</li>;
            })}
          </ul>
        )}
      </dt>
    </div>
  );
};

export const Audit = () => {
  if (typeof colorAudit === 'string') {
    return null;
  }
  return (
    <>
      <h1>Semantic tokens</h1>
      {}
      <h1>Physical tokens</h1>
      {Object.entries(colorAudit).map(([seriesId, audits]) => {
        return (
          <>
            <h2 className='mbs-4 mbe-2'>{seriesId}</h2>
            <dl className='flex flex-wrap'>
              {audits.map((audit) => (
                <Swatch key={audit.variableName} {...audit} />
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
};

export default meta;
