//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { useContributions } from '../hooks.ts';
import { Note, Section, type ViewProps } from './common.tsx';

/** Each skill the module defines, with the operations it gives the assistant as tools. No model is called. */
export const SkillView = ({ moduleId }: ViewProps) => {
  const skills = useContributions([moduleId], AppCapabilities.SkillDefinition).map((definition) => definition.make());

  if (skills.length === 0) {
    return <Note>This module defines no skills.</Note>;
  }

  return (
    <>
      {skills.map((skill) => (
        <Section key={skill.name} title={skill.name}>
          <Note>The tools it gives the assistant:</Note>
          <ul className='text-sm font-mono'>
            {skill.tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
};
