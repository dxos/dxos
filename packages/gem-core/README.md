# GEM X

```tsx
export const Primary = () => {
  const gridRef = useRef<SVGSVGElement>();

  const handleResize = (({ width, height }) => {
    d3.select(gridRef.current).call(grid({ width, height }));
  });

  return (
    <div>
      <SvgContainer onResize={handleResize}>
        <g className='grid' ref={gridRef} />
      </SvgContainer>
    </div>
  );
}
```
