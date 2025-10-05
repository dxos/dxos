//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

const DefaultStory = () => {
  return (
    <div className='mli-auto p-8 max-is-[60rem] space-b-4'>
      <h1 className='text-4xl font-medium'>
        Việc <span className='italic'>thừa</span> nhận{' '}
        <span className='font-mono bg-neutral-500/10'>
          nhân <span className='italic'>phẩm ~~&gt;</span> vốn
        </span>{' '}
        có, các quyền
      </h1>
      <p>
        Không ai bị bắt, giam giữ hay đày đi nơi khác một cách độc đoán. Mọi người, với tư cách bình đẳng về mọi phương
        diện, đều có quyền được một toà án độc lập và vô tư phân xử công bằng và công khai để xác định quyền, nghĩa vụ
        hoặc bất cứ một lời buộc tội nào đối với người đó.
      </p>
      <h2 className='text-xl font-semibold'>
        Mọi <span className='font-mono'>Mọi</span> người đều có quyền nghỉ ngơi và giải trí, kể cả quyền được hạn chế
        hợp lý về số giờ làm việc và hưởng những ngày nghỉ định kỳ được trả lương.
      </h2>
      <p className='font-mono bg-neutral-500/10'>
        Mọi người đều có quyền được hưởng trật tự xã hội và trật tự quốc tế trong đó các quyền và tự do nêu trong Bản
        tuyên ngôn này có thể được thực hiện đầy đủ.
      </p>
      <p className='italic'>
        Không được phép diễn giải bất kỳ điều khoản nào trong Bản tuyên ngôn này theo hướng ngầm ý cho phép bất kỳ quốc
        gia,{' '}
        <span className='not-italic'>
          nhóm người hay cá nhân nào được quyền tham gia vào bất kỳ hoạt động nào hay thực hiện bất kỳ hành vi nào nhằm
          phá hoại bất kỳ quyền và tự do nào nêu trong Bản tuyên ngôn này.
        </span>
      </p>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/Playground/Typography',
  render: DefaultStory,
  decorators: [withTheme],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
