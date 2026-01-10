import { type StoryObj } from '@storybook/react-vite';
import React from 'react';
type StoryProps = {
    columns?: number;
    debug?: boolean;
};
declare const meta: {
    title: string;
    render: ({ columns: columnsProp, debug }: StoryProps) => React.JSX.Element;
    decorators: import("@storybook/react").Decorator[];
    parameters: {
        layout: string;
    };
};
export default meta;
type Story = StoryObj<typeof meta>;
export declare const Default: Story;
//# sourceMappingURL=MosaicSurface.stories.d.ts.map