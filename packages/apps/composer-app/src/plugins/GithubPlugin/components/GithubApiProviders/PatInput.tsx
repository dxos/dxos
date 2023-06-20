//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { PropsWithChildren, useEffect, useState } from 'react';

import { Link, Input, Trans, useTranslation, useId } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { useSplitViewContext } from '@dxos/react-surface';

import { useOctokitContext } from './OctokitProvider';

const ExternalLink = ({ children }: PropsWithChildren<{}>) => {
  const { t } = useTranslation('composer');
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

export const PatInput = () => {
  const { t } = useTranslation('plugin-github');
  const { pat, setPat } = useOctokitContext();
  const [patValue, setPatValue] = useState(pat);
  const { dialogOpen } = useSplitViewContext();

  useEffect(() => {
    setPatValue(pat);
  }, [pat]);

  useEffect(() => {
    if (!dialogOpen) {
      void setPat(patValue);
    }
  }, [dialogOpen]);

  return (
    <Input.Root>
      <div role='none' className='mlb-4 max-is-md text-start'>
        <Input.Label>{t('github pat label')}</Input.Label>
        <Input.TextInput
          autoFocus
          spellCheck={false}
          classNames='font-mono mlb-1'
          value={patValue}
          onChange={({ target: { value } }) => setPatValue(value)}
        />
        <Input.DescriptionAndValidation classNames='mbs-0.5'>
          <Input.Description>
            <Trans
              {...{
                t,
                i18nKey: 'github pat description',
                components: {
                  docsLink: <ExternalLink />,
                },
              }}
            />
          </Input.Description>
        </Input.DescriptionAndValidation>
      </div>
    </Input.Root>
  );
};
