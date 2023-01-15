import React from 'react'
import { createRoot } from 'react-dom/client'

console.log('frame main')

const Component = Function('React', `return React.lazy(() => import('@frame/bundle'))`)(React);

createRoot(document.getElementById('root')!)
  .render(
    <div>
      <Component/>
    </div>
  )