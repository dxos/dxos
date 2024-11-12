//
// Copyright 2024 DXOS.org
//

import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
  pickedCompletion,
} from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export type CompletionOptions = {
  onQuery: (text: string) => Promise<CompletionResult['options']>;
  onMatch: (data: any) => void;
};

/**
 * Autocomplete Codemirror extension.
 * https://codemirror.net/docs/ref/#autocomplete.autocompletion
 */
export const completion = ({ onQuery, onMatch }: CompletionOptions): Extension => {
  return [
    EditorView.theme({
      '.cm-completionDialog': {
        width: 'var(--dx-gridCellWidth)',
      },
    }),

    autocompletion({
      icons: false,
      activateOnTyping: true,
      override: [
        async (context: CompletionContext): Promise<CompletionResult> => {
          const text = context.state.doc.toString();
          return {
            from: 0,
            options: await onQuery(text),
          };
        },
      ],

      // TODO(burdon): Consts from grid (to line-up with grid).
      tooltipClass: () => 'cm-completionDialog !mt-[8px] !-ml-[4px] [&>ul]:!max-h-[264px]',
      optionClass: () => 'flex h-[33px] items-center',

      // Uncomment to debug.
      // closeOnBlur: true,
    }),

    // Check for accepted completion metadata in the transaction.
    EditorView.updateListener.of((update) => {
      update.transactions.forEach((tr) => {
        const completion = tr.annotation(pickedCompletion);
        if (completion) {
          onMatch((completion as any).data);
        }
      });
    }),
  ];
};
