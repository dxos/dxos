import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { react, dxosUi } }) =>
    react &&
    plate`
      import React, { Component, PropsWithChildren } from 'react';

      type State = { error: Error | null }

      export class ErrorBoundary extends Component<PropsWithChildren<{}>, State> {
        constructor(props) {
          super(props);
          this.state = { error: null }
        }

        static getDerivedStateFromError(error: Error) {
          return { error };
        }

        override render() {
          if (this.state.error) {
            return <Fallback error={this.state.error} />;
          }

          return this.props.children;
        }
      }
      
      const Fallback = ({ error }: { error: Error }) => {
        return (
          ${dxosUi ? plate`
          <div className='p-4'>
            <h1 className='text-lg font-bold my-2'>{error.message}</h1>
            <pre>{error.stack}</pre>
          </div>
          ` : plate`
          <div style={{ padding: '1rem' }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0.5rem 0' }}>{error.message}</h1>
            <pre>{error.stack}</pre>
          </div>
          `}
        );
      };
    `,
});
