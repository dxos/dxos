//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { useContributions } from '../hooks.ts';
import { Note, Section, type ViewProps } from './common.tsx';

/** Every string the module contributes, by namespace and language. */
export const TranslationsView = ({ moduleId }: ViewProps) => {
  const resources = useContributions([moduleId], AppCapabilities.Translations).flat();
  const entries = resources.flatMap((resource) =>
    Object.entries(resource).flatMap(([language, namespaces]) =>
      Object.entries(namespaces).map(([namespace, strings]) => ({ language, namespace, strings })),
    ),
  );

  if (entries.length === 0) {
    return <Note>This module contributes no strings.</Note>;
  }

  return (
    <>
      {entries.map(({ language, namespace, strings }) => (
        <Section key={`${language}:${namespace}`} title={`${namespace} · ${language}`}>
          <table className='text-sm'>
            <tbody>
              {Object.entries(strings).map(([key, value]) => (
                <tr key={key}>
                  <td className='font-mono pe-4 py-0.5 align-top text-description'>{key}</td>
                  <td className='py-0.5'>{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ))}
    </>
  );
};
