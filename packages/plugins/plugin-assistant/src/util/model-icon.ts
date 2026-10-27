//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

/** Logos by the vendor segment of a model id (`com.<vendor>.model.…`); written out so the sprite scanner finds them. */
const VENDOR_ICONS: Record<string, string> = {
  anthropic: 'px--anthropic--regular',
  deepseek: 'px--deepseek--regular',
  google: 'ph--google-logo--regular',
  meta: 'ph--meta-logo--regular',
  openai: 'ph--open-ai-logo--regular',
};

/** A vendor without a logo still gets an icon, so the model list stays aligned. */
const FALLBACK_ICON = 'ph--cpu--regular';

/** The icon for a model: its vendor's logo, read from the model id's reverse-DNS name. */
export const modelIcon = (model: DXN.DXN | undefined): string => {
  const vendor = model && DXN.tryMake(model) ? DXN.getName(model).split('.')[1] : undefined;
  // Own keys only, so a vendor named like an `Object` member (`constructor`) gets the fallback.
  return vendor && Object.hasOwn(VENDOR_ICONS, vendor) ? VENDOR_ICONS[vendor] : FALLBACK_ICON;
};
