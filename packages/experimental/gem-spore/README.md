# GEM Spore

A small, usually single-celled reproductive body that is resistant to adverse environmental conditions 
and is capable of growing into a new organism, produced especially by certain fungi, algae, protozoans, 
and nonseedbearing plants such as mosses and ferns.

```tsx
export const Primary = () => {
  const model = useMemo(() => new GraphBuilder(), []);
  
  <FullScreen>
    <SVGContextProvider>
      <SVG>
        <Markers />
        <Grid axis />
        <Zoom extent={[1/2, 2]}>
          <Graph
            model={model.graph}
          />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  </FullScreen>
};
```
