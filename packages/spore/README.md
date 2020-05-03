# spore

React components and hooks for D3.


## D3

- https://vega.github.io/vega/examples
- https://github.com/d3/d3/blob/master/API.md
- https://github.com/d3/d3-shape
- https://github.com/d3/d3/wiki/Gallery
- https://www.d3indepth.com

- Joins
    - https://observablehq.com/@d3/selection-join
    - https://github.com/d3/d3-selection#selection_join
    - https://bost.ocks.org/mike/join/
    - `d3.selectAll('g').data([]).join(enter => enter.append('g'), update, exit).call(joined)`

- Call

- Data
    - https://medium.com/@yonester/on-d3-and-arrow-functions-b6559c1cebb8
    - Arrow functions.
    - `d3.selectAll('g').each((d, i, nodes) => d3.select(nodes[i]))` replaces `function() { d3.select(this)` }.


## Javascript

- Generators (and `yield`)
    - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield
    - https://stackoverflow.com/questions/27661306/can-i-use-es6s-arrow-function-syntax-with-generators-arrow-notation


## React

- `useState(() => expensive())` Function is only evaluated once.

