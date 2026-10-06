//
// Copyright 2026 DXOS.org
//

import { Domino } from '@dxos/ui';

/**
 * A button that submits its text as the reader's next prompt, through the thread's delegated
 * `submit` action — shared by the suggestion and select widgets so the two read as one control.
 */
export const submitButton = (value: string, icon?: string) => {
  const button = Domino.of('button')
    .attributes({ 'data-size': 'md', 'data-action': 'submit', 'data-value': value })
    .classNames('dx-control dx-button dx-container-query-inline-size gap-2 min-w-0 max-w-full overflow-hidden');
  if (icon) {
    button.append(Domino.svg(icon).classNames('shrink-0 size-4 text-fg-muted'));
  }
  return button.append(Domino.of('span').classNames('truncate min-w-0').text(value));
};
