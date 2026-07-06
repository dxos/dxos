//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { type XmlWidgetProps, getXmlTextChild } from '@dxos/ui-editor';

import { ChatSurface } from '#components';

/**
 * Renders an agent-requested UI surface (the `<surface>` content block) by dispatching to a
 * registered {@link ChatSurface} surface keyed on its `role`. The payload is carried as JSON in the
 * tag's text content; a malformed payload renders the surface with no data rather than throwing.
 */
export const SurfaceWidget = ({ role, children }: XmlWidgetProps<{ role?: string }>) => {
  const data = useMemo(() => {
    const raw = getXmlTextChild(children ?? []);
    if (!raw) {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      // Model-supplied JSON payload: narrowed to a non-array object; no typed schema exists at this boundary.
      return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch (err) {
      log.warn('failed to parse surface data', { raw, err });
      return undefined;
    }
  }, [children]);

  if (!role) {
    return null;
  }

  return <Surface.Surface type={ChatSurface} data={{ role, data }} limit={1} />;
};
