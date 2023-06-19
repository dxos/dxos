//
// Copyright 2023 DXOS.org
//
import { Link, LinkBreak } from '@phosphor-icons/react';
import React, { useMemo } from 'react';

import { DropdownMenu, useTranslation } from '@dxos/aurora';
import { ComposerModel } from '@dxos/aurora-composer';
import { getSize } from '@dxos/aurora-theme';
import { log } from '@dxos/log';
import { useSplitViewContext } from '@dxos/react-surface';

import { MarkdownProperties } from '../../../MarkdownPlugin/components';
import { GhIdentifier } from '../props';

export const MarkdownActions = ({ data }: { data: any }) => {
  const [_model, properties]: [ComposerModel, MarkdownProperties] = data;
  const { t } = useTranslation('plugin-github');
  const splitView = useSplitViewContext();

  const docGhId = useMemo<GhIdentifier | null>(() => {
    try {
      const key = properties.keys?.find((key) => key.source === 'com.github');
      const [owner, repo, type, ...rest] = key?.id?.split('/') ?? [];
      if (type === 'issues') {
        return {
          owner,
          repo,
          issueNumber: parseInt(rest[0], 10),
        };
      } else if (type === 'blob') {
        const [ref, ...pathParts] = rest;
        return {
          owner,
          repo,
          ref,
          path: pathParts.join('/'),
        };
      } else {
        return null;
      }
    } catch (err) {
      log.catch(err);
      return null;
    }
  }, [properties.keys]);

  return (
    <>
      <DropdownMenu.GroupLabel>{t('markdown actions label')}</DropdownMenu.GroupLabel>
      {docGhId ? (
        <>
          <DropdownMenu.Item
            classNames='gap-2'
            onClick={() => {
              const index = properties.keys?.findIndex((key) => key.source === 'com.github');
              index && index >= 0 && properties.keys?.splice(index, 1);
            }}
          >
            <LinkBreak className={getSize(4)} />
            <span>{t('unbind to file in github label')}</span>
          </DropdownMenu.Item>
        </>
      ) : (
        <DropdownMenu.Item
          classNames='gap-2'
          onClick={() => {
            splitView.dialogContent = ['dxos:githubPlugin/BindDialog', properties];
            splitView.dialogOpen = true;
          }}
        >
          <Link className={getSize(4)} />
          <span>{t('bind to file in github label')}</span>
        </DropdownMenu.Item>
      )}
    </>
  );
};
