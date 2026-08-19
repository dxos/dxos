//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Banner, Button, Panel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type UnsupportedTypeProps = {
  /** The surface's own role, threaded to `Panel.Root`. */
  role?: string;
  /** Typename of the object no plugin in this build can render. */
  typename: string;
  /**
   * Link to the same object in a build that does carry every plugin. Absent when there is nowhere
   * to send the user — this build is already the extensible one, and the plugin is merely disabled.
   */
  href?: string;
};

/**
 * Inert stand-in for an object whose plugin this build omits, so a plank names what it holds and
 * where to open it instead of rendering empty. Which objects reach it is the surface's call — see
 * `capabilities/unsupported-type-surface.tsx`.
 */
export const UnsupportedType = ({ role, typename, href }: UnsupportedTypeProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='grid place-items-center p-8'>
        <Banner.Root valence='info' icon='ph--puzzle-piece--regular'>
          <Banner.Content classNames='max-w-[32rem]'>
            <Banner.Title>{t('unsupported-type.title')}</Banner.Title>
            <Banner.Body asChild classNames='gap-2'>
              <div data-testid='previewPlugin.unsupportedType'>
                <p>{t('unsupported-type.message', { typename })}</p>
                {href && (
                  <Button variant='valence' asChild>
                    {/* `noreferrer` because the target is a different origin holding the same identity. */}
                    <a href={href} target='_blank' rel='noreferrer'>
                      {t('unsupported-type-open.label')}
                    </a>
                  </Button>
                )}
              </div>
            </Banner.Body>
          </Banner.Content>
        </Banner.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
