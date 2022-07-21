import { useState } from 'react';
import Meta from '@/components/Meta';
import { FullSizeCenteredFlexBox } from '@/components/styled';
import TodoList, { TodoItem } from '@/components/TodoList';
import useOrientation from '@/hooks/useOrientation';
import useEvent from '@react-hook/event';

const randomString = () => Math.random().toString(16).slice(2, 6);

function Welcome() {
  const isPortrait = useOrientation();

  const width = isPortrait ? '40%' : '30%';
  const height = isPortrait ? '30%' : '40%';

  const [list, setList] = useState<TodoItem[]>([]);

  // useEvent(typeof window != 'undefined' ? window : null, 'keyup', (e: any) => {
  //   console.log(e.key);
  //   // setList([...list, { id: randomString(), title: '' }]);
  // });

  return (
    <>
      <Meta title="TODO" />
      <FullSizeCenteredFlexBox flexDirection={isPortrait ? 'column' : 'row'}>
        <TodoList
          items={list}
          onCreate={(s) => {
            setList([
              {
                id: randomString(),
                title: s,
                createdAt: new Date(),
              },
              ...list,
            ]);
          }}
          onTitleChanged={(item, val) => {
            item.title = val;
            setList([...list]);
          }}
          onChecked={(item, val) => {
            item.completedAt = val ? new Date() : void 0;
            setList([...list]);
          }}
        />
      </FullSizeCenteredFlexBox>
    </>
  );
}

export default Welcome;
