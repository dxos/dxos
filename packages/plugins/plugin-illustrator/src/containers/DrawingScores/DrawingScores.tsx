//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { useObject } from '@dxos/echo-react';
import { Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type Drawing, IllustratorCapabilities } from '#types';
import { findVariant, scoreScene } from '#util';

export type DrawingScoresProps = {
  role?: string;
  drawing: Drawing.Drawing;
};

const percent = (score: number) => `${Math.round(score * 100)}`;

/** Bar color by score: the reader's eye goes to the red rows first. */
const tone = (score: number) => (score >= 0.75 ? 'bg-emerald-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-rose-500');

/**
 * The drawing's layout scores, recomputed whenever its scene changes, with the overall score of each
 * version seen so far — so an agent redrawing in a loop shows its progression beside the picture.
 */
export const DrawingScores = ({ role, drawing }: DrawingScoresProps) => {
  const { t } = useTranslation(meta.profile.key);
  const variants = useCapabilities(IllustratorCapabilities.VariantProvider);
  const ref = drawing.canvas;
  const [snapshot] = useObject(ref);
  const canvas = snapshot ? ref.target : undefined;
  const match = canvas ? findVariant(variants, canvas) : undefined;

  // Keyed on the snapshot so every committed change to the canvas rescores it.
  const result = useMemo(() => {
    if (!canvas || !match) {
      return undefined;
    }
    const objects = match.builder.read(canvas).scene.objects;
    return objects.length ? scoreScene(objects) : undefined;
  }, [snapshot, canvas, match]);

  const [history, setHistory] = useState<number[]>([]);
  const overall = result?.overall;
  useEffect(() => {
    if (overall !== undefined) {
      setHistory((previous) => (previous[previous.length - 1] === overall ? previous : [...previous, overall]));
    }
  }, [overall]);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {!result ? (
              <p className='p-3 text-description'>{t('scores.empty.label')}</p>
            ) : (
              <div className='flex flex-col gap-3 p-3 text-sm' data-testid='illustrator.scores'>
                <div className='flex items-baseline gap-2'>
                  <span className='text-3xl font-medium tabular-nums' data-testid='illustrator.scores.overall'>
                    {overall === undefined ? '—' : percent(overall)}
                  </span>
                  <span className='text-description'>overall</span>
                </div>
                {history.length > 1 && (
                  <ol className='flex flex-wrap items-center gap-1 text-xs tabular-nums' aria-label='versions'>
                    {history.map((score, index) => (
                      <li key={index} className='flex items-center gap-1'>
                        {index > 0 && <span className='text-description'>→</span>}
                        <span className={mx('rounded px-1 text-white', tone(score))}>{percent(score)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <ul className='flex flex-col gap-2'>
                  {result.scores.map(({ id, kind, score, detail }) => (
                    <li key={id} className='flex flex-col gap-1'>
                      <div className='flex items-center gap-2'>
                        <span className='rounded border border-separator px-1 text-xs text-description'>{kind}</span>
                        <span className='grow truncate'>{id}</span>
                        <span className='tabular-nums'>{percent(score)}</span>
                      </div>
                      <div className='h-1.5 rounded bg-separator'>
                        <div className={mx('h-full rounded', tone(score))} style={{ width: `${score * 100}%` }} />
                      </div>
                      {detail && <span className='text-xs text-description'>{detail}</span>}
                    </li>
                  ))}
                </ul>
                {result.diagnostics.length > 0 && (
                  <ul className='flex flex-col gap-1 text-xs text-description'>
                    {result.diagnostics.slice(0, 12).map(({ code, message }, index) => (
                      <li key={index}>
                        <span className='font-medium'>{code}</span> {message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

DrawingScores.displayName = 'DrawingScores';
