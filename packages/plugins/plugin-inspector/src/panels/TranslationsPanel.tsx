//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { useContributions } from '../hooks.ts';
import { Empty, type PanelProps, Section } from './common.tsx';

/** Every string the plugin's translations contribute, by language and namespace. */
export const TranslationsPanel = ({ pluginId, empty }: PanelProps) => {
  const contributions = useContributions(pluginId, AppCapabilities.Translations);
  const entries = contributions.flatMap(({ value: resources }) =>
    resources.flatMap((resource) =>
      Object.entries(resource).flatMap(([language, namespaces]) =>
        Object.entries(namespaces).map(([namespace, strings]) => ({ language, namespace, strings })),
      ),
    ),
  );

  if (entries.length === 0) {
    return <Empty>{empty}</Empty>;
  }

  return (
    <>
      {entries.map(({ language, namespace, strings }) => (
        <Section key={`${language}:${namespace}`} title={`${namespace} (${language})`}>
          <table className='text-sm'>
            <tbody>
              {Object.entries(strings).map(([key, value]) => (
                <tr key={key}>
                  <td className='font-mono pr-4 align-top'>{key}</td>
                  <td>{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ))}
    </>
  );
};
