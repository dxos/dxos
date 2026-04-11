//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { TogglePanel } from '@dxos/react-ui-components';
import { getXmlTextChild, type XmlWidgetProps } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

/**
 * Collapsible reasoning / “thinking” stream, aligned with {@link ToolWidget} panels.
 */
export const ReasoningPanelWidget = ({ children, view }: XmlWidgetProps) => {
  const { t } = useTranslation(meta.id);
  const text = getXmlTextChild(children ?? []) ?? '';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      view?.requestMeasure();
    }, 1_000);

    return () => {
      clearTimeout(timer);
    };
  }, [open, view]);

  return (
    <div className='py-1'>
      <TogglePanel.Root classNames='w-full rounded-xs !border-0' open={open} onChangeOpen={setOpen}>
        <TogglePanel.Header classNames='text-sm text-placeholder p-0.5 gap-0.5'>
          {t('thinking.label')}
        </TogglePanel.Header>
        <TogglePanel.Content>
          <div
            role='none'
            className={mx(
              'text-sm text-placeholder whitespace-pre-wrap break-words',
              open ? 'py-1 pl-8 pr-4' : 'px-1 py-0.5',
            )}
          >
            {text}
          </div>
        </TogglePanel.Content>
      </TogglePanel.Root>
    </div>
  );
};
