//
// Copyright 2026 DXOS.org
//

/** The selection props of `Next.Listbox.Root`. */
export type ListboxSelectionProps = {
  selectionMode: 'single' | 'multiple';
  value: string[];
  onValueChange: (value: string[]) => void;
  deselectable?: boolean;
};

export type ListboxSelectionOptions =
  | { mode: 'single'; value: string | undefined; onValueChange: (value: string | undefined) => void }
  | { mode: 'multi'; value: ReadonlySet<string>; onValueChange: (value: ReadonlySet<string>) => void };

/**
 * The optional adapter from `useListSelection`'s value shapes (one id, or a set of ids) to the props of
 * `Next.Listbox.Root`, where Ark owns selection (AUDIT §6 group B). A single selection is deselectable.
 *
 * @example
 *   const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
 *   <Next.Listbox.Root items={items} {...listboxSelection({ mode: 'multi', value: ids, onValueChange: setIds })}>
 */
export const listboxSelection = (options: ListboxSelectionOptions): ListboxSelectionProps => {
  if (options.mode === 'multi') {
    const { value, onValueChange } = options;
    return {
      selectionMode: 'multiple',
      value: Array.from(value),
      onValueChange: (next) => onValueChange(new Set(next)),
    };
  }
  const { value, onValueChange } = options;
  return {
    selectionMode: 'single',
    value: value === undefined ? [] : [value],
    onValueChange: ([next]) => onValueChange(next),
    deselectable: true,
  };
};
