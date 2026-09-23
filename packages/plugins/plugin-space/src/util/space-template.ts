//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { iconValues } from '@dxos/ui-types';

/** A template's icon, or undefined when it is not one the icon picker can also produce. */
export const getTemplateIcon = (template?: AppCapabilities.SpaceTemplate): string | undefined =>
  template?.icon && iconValues.includes(template.icon) ? template.icon : undefined;

/** The Phosphor name for {@link getTemplateIcon}, falling back to the placeholder glyph. */
export const getTemplateIconGlyph = (template?: AppCapabilities.SpaceTemplate): string => {
  const icon = getTemplateIcon(template);
  return icon ? `ph--${icon}--regular` : 'ph--placeholder--regular';
};
