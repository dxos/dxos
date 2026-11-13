//
// Copyright 2026 DXOS.org
//

import React, {
  Component,
  type FormEvent,
  type ReactNode,
  useState,
} from 'react';

/** A field and a button, which shows the error if `onSubmit` fails. */
export const Prompt = ({
  label,
  action,
  initial = '',
  multiline,
  compact,
  autoFocus = true,
  onSubmit,
}: {
  label: string;
  action: string;
  initial?: string;
  multiline?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  onSubmit: (value: string) => Promise<unknown>;
}) => {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }
    setBusy(true);
    setError(undefined);
    // Wrapped so that a handler that throws shows its error like one that rejects.
    new Promise((resolve) => resolve(onSubmit(value))).then(
      () => setBusy(false),
      (error) => {
        setBusy(false);
        setError(String(error));
      },
    );
  };
  const field = multiline ? (
    <textarea
      className='cb-input'
      rows={3}
      value={value}
      autoFocus={autoFocus}
      onChange={(event) => setValue(event.target.value)}
    />
  ) : (
    <input
      className='cb-input'
      value={value}
      autoFocus={autoFocus}
      onChange={(event) => setValue(event.target.value)}
    />
  );
  return (
    <form
      className={compact ? 'cb-prompt cb-compact' : 'cb-prompt'}
      onSubmit={handleSubmit}
    >
      <label className='cb-label'>
        {!compact && <span>{label}</span>}
        {field}
      </label>
      <button
        className='cb-button cb-primary'
        disabled={busy}
        aria-label={compact ? label : undefined}
      >
        {action}
      </button>
      {error && <p className='cb-error'>{error}</p>}
    </form>
  );
};

export const Copyable = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className='cb-row'>
      <input
        className='cb-input cb-code'
        readOnly
        value={value}
        onFocus={(event) => event.target.select()}
      />
      <button
        className='cb-button'
        onClick={() =>
          navigator.clipboard.writeText(value).then(() => setCopied(true))
        }
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
};

export const Person = ({
  name,
  online,
}: {
  name?: string;
  online: boolean;
}) => (
  <span className='cb-person'>
    <span className='cb-avatar'>{initial(name)}</span>
    {name ?? 'Anonymous'}
    <span
      className='cb-dot'
      data-online={online}
      title={online ? 'Online' : 'Offline'}
    />
  </span>
);

export const initial = (name?: string) =>
  (name?.trim()[0] ?? '?').toUpperCase();

/** Shows the error in place of `children` when they fail to render. */
export class Boundary extends Component<
  { children: ReactNode },
  { error?: unknown }
> {
  override state: { error?: unknown } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override render() {
    return this.state.error === undefined ? (
      this.props.children
    ) : (
      <p className='cb-error'>{String(this.state.error)}</p>
    );
  }
}
