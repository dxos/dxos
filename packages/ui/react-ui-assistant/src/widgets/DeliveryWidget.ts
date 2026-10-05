//
// Copyright 2026 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino, mx } from '@dxos/ui';
import { getSize } from '@dxos/ui-theme';

import { type DeliveryStatus } from '../delivery.ts';

export type DeliveryLabels = Record<DeliveryStatus | 'retry' | 'remove', string>;

const ICONS: Record<DeliveryStatus, string> = {
  sent: 'ph--check--regular',
  delivered: 'ph--checks--regular',
  read: 'ph--checks--bold',
  failed: 'ph--warning-circle--regular',
};

/**
 * The delivery ticks under a prompt still on its way to the agent, with its retry/remove controls.
 *
 * Every state is one line of the same height, so a prompt moving from sent to read never moves the
 * rows below it. The controls are `data-action` buttons the thread's delegated listener turns into
 * events, as the suggestion chips are, which keeps the widget renderable from its tag alone.
 */
export class DeliveryWidget extends WidgetType {
  constructor(
    private readonly status: DeliveryStatus,
    private readonly messageId: string,
    private readonly labels: DeliveryLabels,
  ) {
    super();
  }

  override eq(other: this) {
    return this.status === other.status && this.messageId === other.messageId && this.labels === other.labels;
  }

  override toDOM() {
    const status = this.status;
    const root = Domino.of('div')
      .classNames(
        mx(
          'flex justify-end items-center gap-2 pt-1 text-xs leading-4',
          status === 'failed' ? 'text-error-text' : status === 'read' ? 'text-accent-text' : 'text-fg-subtle',
        ),
      )
      .attributes({ 'data-testid': 'chat.delivery', 'data-delivery': status });

    // A queued prompt the agent has not taken up can still be withdrawn; one it has, cannot.
    if (status === 'failed') {
      root.append(this.#action('retry'));
    }
    if (status === 'failed' || status === 'delivered') {
      root.append(this.#action('remove'));
    }

    root.append(
      Domino.of('dx-icon')
        .classNames(getSize(4))
        .attributes({
          'icon': ICONS[status],
          'role': 'img',
          'aria-label': this.labels[status],
          'title': this.labels[status],
        }),
    );

    return root.root;
  }

  #action(action: 'retry' | 'remove') {
    return Domino.of('button')
      .attributes({ 'type': 'button', 'data-action': action, 'data-value': this.messageId })
      .classNames('underline underline-offset-2 hover:text-fg-default')
      .text(this.labels[action]);
  }
}
