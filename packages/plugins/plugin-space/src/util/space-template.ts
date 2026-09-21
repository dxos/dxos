//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { iconValues } from '@dxos/ui-types';

/**
 * A template's icon, or undefined when it is not one the icon picker can also produce.
 *
 * Contributed by another plugin and never checked by a type, so it is validated wherever it enters
 * the app: both the create dialog, which seeds the form from it, and the create operation, which
 * reads it for a caller naming a template by id. An unrecognized name is dropped rather than
 * persisted onto the space, where it would render as a blank.
 */
export const getTemplateIcon = (template?: AppCapabilities.SpaceTemplate): string | undefined =>
  template?.icon && iconValues.includes(template.icon) ? template.icon : undefined;
