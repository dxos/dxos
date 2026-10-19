//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useObject, useResolveRef } from '@dxos/echo-react';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { type Showcase } from '#types';

export type ShowcaseCardContentProps = AppSurface.ObjectCardProps<Showcase.Showcase>;

/** The write-up's opening lines and how much evidence it carries; the host draws the frame and the name. */
export const ShowcaseCardContent = ({ subject }: ShowcaseCardContentProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [showcase] = useObject(subject);
  const content = useResolveRef(showcase.content);
  const [text] = useObject(content, 'content');
  const excerpt = text
    ?.split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter(Boolean)
    .join(' ');
  return (
    <Card.Body>
      {excerpt && (
        <Card.Row span='full'>
          <Card.Text variant='muted' lines={3}>
            {excerpt}
          </Card.Text>
        </Card.Row>
      )}
      {showcase.artifacts.length > 0 && (
        <Card.Row icon='ph--paperclip--regular'>
          <Card.Text truncate>{t('showcase-card.artifacts.label', { count: showcase.artifacts.length })}</Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};
