//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { SettingsValue } from '@dxos/app-framework';
import { Link, Input, Trans, useTranslation, useId } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { useOctokitContext } from './OctokitProvider';
import { GITHUB_PLUGIN } from '../../meta';

const ExternalLink = ({ children }: PropsWithChildren<{}>) => {
  const { t } = useTranslation(GITHUB_PLUGIN);
  const descriptionId = useId('link--external');
  return (
    <>
      <Link href={t('github pat description href')} target='_blank' rel='noreferrer' aria-describedby={descriptionId}>
        {children}
        <ArrowSquareOut weight='bold' className={mx(getSize(3), 'inline-block leading-none -mbs-0.5 mli-px')} />
      </Link>
      <span className='sr-only' id={descriptionId}>
        {t('target blank description', { ns: 'os' })}
      </span>
    </>
  );
};

// TODO(burdon): Pass in settings.
export const GitHubSettings = () => {
  const { t } = useTranslation(GITHUB_PLUGIN);
  const { pat, setPat } = useOctokitContext();
  const [patValue, setPatValue] = useState(pat);

  useEffect(() => {
    setPatValue(pat);
  }, [pat]);

  useEffect(() => {
    void setPat(patValue);
  }, [patValue]);

  return (
    <>
      <SettingsValue
        label={t('github pat label')}
        description={
          <Trans
            {...{
              t,
              i18nKey: 'github pat description',
              components: {
                docsLink: <ExternalLink />,
              },
            }}
          />
        }
      >
        <Input.TextInput
          autoFocus
          spellCheck={false}
          classNames='font-mono mlb-1'
          value={patValue ?? ''}
          onChange={({ target: { value } }) => setPatValue(value)}
        />
      </SettingsValue>
    </>
  );
};
