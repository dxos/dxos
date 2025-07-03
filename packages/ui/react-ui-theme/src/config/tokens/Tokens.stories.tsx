//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import { auditFacet, type HelicalArcSeries, type TokenAudit, parseAlphaLuminosity } from '@ch-ui/tokens';
import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { tokenSet } from './index';

const colorAudit = auditFacet(tokenSet.colors, { condition: 'p3' });

const Swatch = ({ variableName, value, semantic, physical }: TokenAudit<HelicalArcSeries>) => {
  const [luminosity, alpha] = parseAlphaLuminosity(value);
  return (
    <div className='shrink-0 is-40 flex flex-col rounded overflow-hidden'>
      <dd className='aspect-video' style={{ background: `var(${variableName})` }}></dd>
      <dt className='text-xs bg-baseSurface grow pli-2 plb-1'>
        <p className='text-sm'>
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

const meta: Meta = {
  title: 'ui/react-ui-theme/Tokens',
};

export default meta;

export const Tokens = () => {
  if (typeof colorAudit === 'string') {
    return null;
  }
  return (
    <>
      <style>{`html{
        background-color: #888;
        background-image: linear-gradient(45deg, #777 25%, transparent 25%, transparent 75%, #777 75%, #777),
        linear-gradient(45deg, #777 25%, transparent 25%, transparent 75%, #777 75%, #777);
        background-size: 32px 32px;
        background-position: 0 0, 16px 16px;
      }`}</style>
      <div className='flex'>
        <div className='p-2 bg-baseSurface rounded'>
          <h1 className='text-lg mbe-2'>Physical color token audit</h1>
          <pre className='text-xs'>
            Luminosity (/ alpha)?
            <br />
            value // (whether added directly as a physical value)
            <br />
            naming // (whether added as a named physical value)
            <br />
            ...`semantic token name / theme`[]
          </pre>
        </div>
      </div>
      {Object.entries(colorAudit).map(([seriesId, audits]) => {
        return (
          <>
            <h2 className='mbs-12 mbe-4'>
              <span className='pli-2 plb-1 bg-baseSurface rounded'>{seriesId}</span>
            </h2>
            <dl className='flex flex-wrap gap-2'>
              {audits
                .sort((a, b) => {
                  const [aL, aA] = parseAlphaLuminosity(a.value);
                  const [bL, bA] = parseAlphaLuminosity(b.value);
                  return aL - bL - (Number.isFinite(aA) && Number.isFinite(bA) ? aA! - bA! : 0);
                })
                .map((audit) => (
                  <Swatch key={audit.variableName} {...audit} />
                ))}
            </dl>
          </>
        );
      })}
    </>
  );
};
