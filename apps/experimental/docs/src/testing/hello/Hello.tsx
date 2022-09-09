import * as React from 'react';

interface HelloProps {
  message?: string 
}

const Hello = (props: HelloProps) => {
  return (
    <div>
      HELLO WORLD!!
    </div>
  );
}

export default Hello;