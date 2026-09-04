//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { Button, Icon, Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { ArchifySvg } from '#components';
import { meta } from '#meta';
import { Layout } from '#model';
import { type Diagram } from '#types';

export type DiagramArticleProps = {
  subject: Diagram.Diagram;
  role?: string;
  attendableId?: string;
  extrinsic?: boolean;
};

/**
 * Article/section/slide surface. The reading affordances are Archify's: step through the authored
 * guided views, or pick a component and trace what it reaches. Both are pure view state — neither
 * touches the stored IR, so reading a diagram never edits it.
 */
export const DiagramArticle = ({ subject, role }: DiagramArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [snapshot] = useObject(subject);
  const [viewId, setViewId] = useState<string>();
  const [selected, setSelected] = useState<string>();

  const source = snapshot?.source;
  const views = source?.meta.views ?? [];
  const view = views.find((entry) => entry.id === viewId);

  const focus = useMemo(() => {
    if (!source) {
      return undefined;
    }
    if (selected) {
      return Layout.reach(source, [selected], 'both');
    }
    return view ? new Set(view.focus) : undefined;
  }, [source, view, selected]);

  const onSelect = useCallback((id: string | undefined) => setSelected(id), []);

  if (!source) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      {(views.length > 0 || selected) && (
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Button
              variant={!viewId && !selected ? 'primary' : 'ghost'}
              onClick={() => {
                setViewId(undefined);
                setSelected(undefined);
              }}
            >
              {t('view.all.label')}
            </Button>
            {views.map((entry) => (
              <Button
                key={entry.id}
                variant={entry.id === viewId && !selected ? 'primary' : 'ghost'}
                onClick={() => {
                  setSelected(undefined);
                  setViewId(entry.id === viewId ? undefined : entry.id);
                }}
              >
                {entry.label}
              </Button>
            ))}
            {selected && (
              <div role='none' className='flex items-center gap-1 text-description text-sm'>
                <Icon icon='ph--path--regular' size={4} />
                <span>{t('trace.label', { id: selected })}</span>
              </div>
            )}
          </Toolbar.Root>
        </Panel.Toolbar>
      )}
      <Panel.Content asChild>
        <div role='none' className='dx-attention-surface dx-fill grid grid-rows-[1fr_auto] overflow-hidden'>
          <ArchifySvg classNames='min-h-0' diagram={source} focus={focus} selected={selected} onSelect={onSelect} />
          {(view?.note || (source.cards?.length ?? 0) > 0) && (
            <div role='none' className='p-2 grid gap-2 grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]'>
              {view?.note && <p className='text-description text-sm col-span-full'>{view.note}</p>}
              {!view &&
                source.cards?.map((card) => (
                  <section key={card.title} className='p-2 rounded border border-separator'>
                    <h3 className='text-sm font-medium mb-1'>{card.title}</h3>
                    <ul className='text-description text-xs grid gap-0.5'>
                      {card.items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
            </div>
          )}
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
