import React, { Component, FC, PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  fallback: FC<{ error: Error }>;
}>;

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (this.state.error) {
      const { fallback: Fallback } = this.props;
      return <Fallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
