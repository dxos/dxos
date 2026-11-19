//
// Copyright 2026 DXOS.org
//

// A card's icon and title share one row. The icon is one title line tall (56px at `leading-tight`), so it stands on
// the first line of a title that wraps, and the title gives its own padding up to the row.
const cardHeader = 'flex items-start gap-6 [&>:is(h1,h2,h3)]:p-0 [&>:is(h1,h2,h3)]:min-w-0';
const cardIcon = 'shrink-0 size-[70px] text-(color:--slide-accent)';

// A card's bullets, a step under its title and above its caption text, since they are the card's content rather than
// a line under its art. Each marker is drawn in a column of its own rather than hung outside the list, so it stays
// inside the card's padding: at the title's start edge, or centred under the icon, where the text then starts under
// the title (the icon's 70px and the row's 24px gap).
const cardList =
  'flex flex-col gap-2 list-none text-[40px] leading-snug opacity-80 [counter-reset:slide-card-item] ' +
  '[--slide-card-indent:1.2em] [--slide-card-marker:1.2em] [--slide-card-marker-align:start] ' +
  '[[data-icon]>*>&]:[--slide-card-indent:94px] [[data-icon]>*>&]:[--slide-card-marker:70px] ' +
  '[[data-icon]>*>&]:[--slide-card-marker-align:center]';
const cardItem =
  'relative ps-(--slide-card-indent) [counter-increment:slide-card-item] ' +
  'before:absolute before:start-0 before:w-(--slide-card-marker) ' +
  'before:[text-align:var(--slide-card-marker-align)] ' +
  "[ul>&]:before:content-['•'] [ol>&]:before:content-[counter(slide-card-item)_'.'] " +
  // A list or a paragraph inside an item is already indented by it, so it drops the padding and the dimming the
  // card gives the same tag at its top level, and a loose item's paragraph keeps the item's size.
  '[&>:is(ul,ol)]:p-0! [&>:is(ul,ol)]:mt-2 [&>:is(ul,ol)]:opacity-100 ' +
  '[&>p]:p-0! [&>p]:opacity-100 [&>p]:[font-size:inherit]';

// An icon card is a header over a body, on two rows of its own; in a grid it takes those rows from the grid instead
// (see `grid`), so every card of a grid row has one header height.
const cardRows = '[&[data-icon]]:grid [&[data-icon]]:[grid-template-rows:auto_minmax(0,1fr)] [&[data-icon]]:gap-y-0';
// The body runs to the card's last row, which is further than the second when the card spans grid rows.
const cardBody = 'flex flex-col min-w-0 min-h-0 [grid-row:2/-1]';

// The tracks a grid child covers. The counts are reset on the child itself rather than left to the `var()`
// fallbacks: a custom property inherits, so a child inside a child would otherwise cover the tracks of the one
// around it. An inline `colSpan`/`rowSpan` outranks the reset.
const span =
  '[--slide-col-span:1] [--slide-row-span:1] ' +
  '[grid-column:span_var(--slide-col-span,1)] [grid-row:span_var(--slide-row-span,1)]';

// A heading takes the color the deck's theme sets for its level, else the accent as it stands at the heading, so a
// tone or a slide's own accent still reaches a heading whose color the deck left unset.
const headingColor = 'text-[color:var(--slide-heading,var(--slide-accent))]';
const subheadingColor = 'text-[color:var(--slide-subheading,var(--slide-accent))]';

/** Classes for the 2560×1440 slide canvas (`SlideFrame` scales it to fit); colors and fonts come from `--slide-*` variables. */
export const theme = {
  root: 'leading-relaxed',

  padding: 'px-40 py-16',

  nodes: {
    // Headings set tight, so a title that wraps takes two short lines rather than the body's relaxed spacing.
    h1: `text-[80px] leading-tight ${headingColor} font-(family-name:--slide-font-heading) text-balance`,
    h2: `text-[60px] leading-tight ${subheadingColor} font-(family-name:--slide-font-heading) text-balance`,
    h3: `text-[48px] leading-tight ${subheadingColor} font-(family-name:--slide-font-heading) text-balance`,
    h4: 'text-[40px] leading-tight uppercase font-(family-name:--slide-font-heading) text-balance',

    p: 'text-[48px]',
    a: 'text-(color:--slide-accent) underline',
    blockquote: 'my-[16px] ps-12 border-l-[8px] border-(--slide-accent) text-[56px] italic',
    img: 'max-w-full max-h-full object-contain',

    ul: 'my-[16px] ml-12 leading-relaxed list-disc',
    ol: 'my-[16px] ml-24 leading-relaxed list-decimal',
    li: 'pl-6 text-[48px]',

    table: 'my-[32px] text-[40px] border-collapse',
    th: 'px-6 py-2 border border-(--slide-separator) text-left',
    td: 'px-6 py-2 border border-(--slide-separator)',

    // Important: the highlighter's prism style sets `font-family` and padding inline on the <pre> and its <code>.
    // Clipped: a slide cannot scroll, so a line too long for the box is cut at its padding rather than spilling out.
    pre: 'w-full mx-0 my-[32px] p-12! overflow-hidden! bg-(--slide-code) font-(family-name:--slide-font-mono)! [&_code]:font-(family-name:--slide-font-mono)! [&_.linenumber]:opacity-40',
    code: 'p-0 text-[40px]',
    inlineCode: 'px-2 rounded-sm bg-(--slide-code) text-info-text font-(family-name:--slide-font-mono)',
  },

  /**
   * Named styles selected with `<List variant="…">` and `<Table variant="…">`, keyed by the part each class lands on;
   * a part replaces that tag's plain markdown classes, so a variant owns the whole block. `steps` numbers its rows
   * from a counter, which puts the number inside the row's box rather than outside it as a list marker.
   */
  variants: {
    list: {
      cards: {
        list: 'flex flex-col gap-6 my-[16px] list-none',
        li: 'px-10 py-6 rounded-[20px] bg-(--slide-code) text-[48px]',
      },
      steps: {
        list: 'flex flex-col gap-6 my-[16px] list-none [counter-reset:slide-step]',
        // The counter is positioned, not a flex item: a flex `li` would break `**bold**`, a nested list or a second
        // paragraph out of the text's flow and space them with the row's gap.
        li:
          'relative ps-28 pe-10 py-6 rounded-[20px] bg-(--slide-code) text-[48px] [counter-increment:slide-step] ' +
          'before:absolute before:start-10 before:content-[counter(slide-step)] before:text-(color:--slide-accent)',
      },
      outline: {
        list: 'flex flex-col gap-6 my-[16px] list-none',
        li: 'px-10 py-8 rounded-[20px] border-4 border-(--slide-accent) text-[48px]',
      },
      // A row of cards with an arrow in each gap, for a progression. The item's own markdown names its parts:
      // emphasis is the label beside the counter, strong is the title, and the rest is the body — so four cards
      // fit across the slide without the author writing anything but prose.
      flow: {
        list: 'grid grid-flow-col auto-cols-fr gap-24 my-[16px] list-none [counter-reset:slide-step]',
        li:
          'relative px-10 py-12 rounded-[20px] bg-(--slide-code) text-[32px] leading-normal [counter-increment:slide-step] ' +
          'before:content-[counter(slide-step)] before:text-[28px] before:opacity-60 ' +
          // The arrow sits in the gap after every card but the last; it is decoration, so it never reaches the text.
          // Its box is the gap's own width (`w-24` for `gap-24`), so the glyph is centred between the two cards.
          "after:content-['→'] after:absolute after:start-full after:top-1/2 after:w-24 after:text-center " +
          'after:-translate-y-1/2 ' +
          'after:text-[88px] after:leading-none after:opacity-70 last:after:content-none ' +
          // During a build the arrow waits for the card it points at, which is laid out but not yet revealed.
          '[&:has(+li.invisible)]:after:content-none ' +
          '[&_em]:not-italic [&_em]:uppercase [&_em]:tracking-wide [&_em]:text-[28px] [&_em]:opacity-60 ' +
          '[&_em]:before:content-["·"] [&_em]:before:mx-2 ' +
          '[&_strong]:block [&_strong]:mt-5 [&_strong]:mb-3 [&_strong]:text-[44px] [&_strong]:leading-tight ' +
          '[&_strong]:font-(family-name:--slide-font-heading) ' +
          '[&[data-active]]:border-4 [&[data-active]]:border-(--slide-accent) ' +
          '[&[data-active]]:before:text-(color:--slide-accent) [&[data-active]]:before:opacity-100 ' +
          '[&[data-active]_em]:text-(color:--slide-accent) [&[data-active]_em]:opacity-100',
        // A loose item wraps its content in a paragraph, which would otherwise take the slide's body size and
        // undo the card's.
        p: 'text-[32px] leading-normal',
      },
    },
    box: {
      card: { box: 'p-12 rounded-[24px] bg-(--slide-code)' },
      outline: { box: 'p-12 rounded-[24px] border-4 border-(--slide-accent)' },
      // A title slide's mark: drawn large enough to carry the slide, at a size in canvas units rather than a share of
      // a box that has none of its own. `contents` drops the paragraph markdown wraps a lone image in.
      hero: {
        box: 'flex flex-col items-center',
        img: 'h-[420px] w-auto max-w-full object-contain',
        p: '[&:has(>img)]:contents',
      },
      // A product's mark over its name, as one centred block. The name is set in the brand's display face whatever
      // font the deck picked, since it is the product's wordmark rather than a heading of the deck's.
      brand: {
        box: 'flex flex-col items-center gap-16',
        img: 'h-[640px] w-auto max-w-full object-contain',
        // `!`: an emphasis layout sizes its headings with a descendant rule that outranks a class on the heading.
        h1: "text-[240px]! leading-none! font-['Poiret_One',ui-sans-serif,sans-serif] text-(color:--slide-foreground)",
        p: '[&:has(>img)]:contents',
      },
      // A picture drawn to the column's height and left to run past its sides, which the slide crops rather than the
      // column: art cut at a column's edge ends in mid-air, and `dxos-center.svg` stops short of its own frame (its
      // drawing reaches x 226..1694 of 1920), so cropping it to the column shows exactly where its rays stop.
      // It leaves no gap in the flow, so the words beside it are laid out as though it were not there.
      fill: {
        // The picture stays in the flow and simply overflows: positioning it would lift it above the words in the
        // column beside it, which paint later but are not positioned themselves.
        box: 'grow min-h-0 self-stretch flex items-center justify-center',
        img: 'h-full w-auto max-w-none shrink-0 object-contain',
        p: '[&:has(>img)]:contents',
      },
      // A brand mark standing in for a heading, at a heading's scale rather than a title slide's.
      lockup: {
        box: 'flex',
        img: 'h-[180px] w-auto max-w-full object-contain',
        p: '[&:has(>img)]:contents',
      },
      // Blocks pushed to the slide's own top and bottom edges, which leaves the middle to whatever is behind them —
      // the art on a title slide. It fills the slide, so it carries the slide's padding itself.
      spread: {
        box: 'absolute inset-0 flex flex-col justify-between items-center text-center px-40 py-24',
        img: 'h-[200px] w-auto max-w-full object-contain',
        p: '[&:has(>img)]:contents',
      },
      // A title slide's name and the links under it, set against the slide's start edge rather than its padding:
      // the measurements come from the Figma deck this reproduces, scaled from its 1920-wide frame to the canvas.
      // The name takes the slide's own foreground, which leaves the accent free for the links.
      title: {
        box: 'absolute start-[53px] top-[541px] flex flex-col gap-[209px]',
        // The size is the one at which the deck's display face (Poiret One) draws the name to the width the Figma
        // title covers, and `top` puts its baseline where that slide's is; both would need remeasuring under a
        // different heading font.
        //
        // Important: `cover` and the other emphasis layouts size their headings with a `[&_h1]` descendant rule,
        // which outranks a class on the heading itself, so a variant can only set its own size by overriding it.
        h1:
          'text-[244px]! leading-none! font-(family-name:--slide-font-heading) text-(color:--slide-foreground) ' +
          'text-balance',
        p: 'text-[37px] leading-[1.4]',
        a: 'text-(color:--slide-accent) no-underline',
      },
      // The quiet matter at a slide's foot: a brand lockup and the small print under it, on the same start edge as
      // the title and run to the slide's bottom, so the two blocks share one margin.
      caption: {
        box: 'absolute start-[53px] bottom-[20px] flex flex-col gap-[51px]',
        img: 'w-[399px] h-auto object-contain',
        // The lockup's own paragraph collapses, so the box's gap falls between the mark and the line under it
        // rather than around an empty wrapper.
        p: 'text-[27px] leading-none opacity-50 font-(family-name:--slide-font-mono) [&:has(>img)]:contents',
      },
    },

    // A grid lays down equal tracks from the counts `<Grid cols rows>` set; `minmax(0,1fr)` keeps a long word in one
    // cell from widening the track it sits in. Rows are auto by default, so a grid grows to hold what it is given.
    grid: {
      default: {
        grid:
          // The counts are reset here rather than left to the `var()` fallbacks: a custom property inherits, so a
          // grid inside a grid would otherwise lay down the tracks of the one around it.
          'grid grow min-h-0 gap-8 my-[16px] [--slide-grid-cols:1] [--slide-grid-rows:1] ' +
          '[grid-template-columns:repeat(var(--slide-grid-cols,1),minmax(0,1fr))] ' +
          // The explicit rows `rows` asks for, and any further row an overflowing grid opens, are all one fraction,
          // so the rows stay even however many there turn out to be.
          '[grid-template-rows:repeat(var(--slide-grid-rows,1),minmax(0,1fr))] [grid-auto-rows:minmax(0,1fr)] ' +
          // `align` gives the grid the height of what it holds, where its rows are still even, and an auto margin
          // takes the space left over: after the grid, around it, or before it.
          'data-[align]:grow-0 data-[align=start]:mb-auto data-[align=center]:my-auto data-[align=end]:mt-auto ' +
          // A grid holding icon cards makes each row two tracks, a header as tall as the row's tallest title and
          // a body, and its icon cards take their own two rows from those. The titles of a row then end on one
          // line however each wraps, so the bodies start level.
          '[&:has(>[data-icon])]:[grid-template-rows:repeat(var(--slide-grid-rows,1),auto_minmax(0,1fr))] ' +
          '[&:has(>[data-icon])]:[grid-auto-rows:auto_minmax(0,1fr)] ' +
          '[&>article[data-icon]]:grid-rows-subgrid ' +
          // Every child of such a grid covers both tracks of each row it spans, whatever it is: one left on a
          // single track would start the next card's header on a body track. The span is reset here for a child
          // that sets none of its own, which would otherwise inherit the span of a cell around the grid.
          '[--slide-row-span:1] [&:has(>[data-icon])>*]:[grid-row:span_calc(var(--slide-row-span,1)*2)]',
      },
    },

    // A cell spans the tracks `cols`/`rows` ask for; with neither it is one cell, as any grid child is.
    cell: {
      default: {
        cell: `min-w-0 ${span}`,
      },
    },

    // A card is a filled surface holding art or an icon, a title, and a line or a few bullets: the brand's own card.
    // The art fills the box: its scale stays even across cards of different widths because each card crop
    // (`brand/backgrounds/cards/`) carries a window of the same height, not because of anything the card does.
    card: {
      default: {
        card: `flex flex-col min-w-0 overflow-hidden rounded-[24px] bg-(--slide-code) ${span} ${cardRows}`,
        img: 'w-full grow min-h-0 object-cover',
        h1: 'px-10 pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading) text-balance',
        h2: 'px-10 pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading) text-balance',
        h3: 'px-10 pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading) text-balance',
        p: 'px-10 pb-8 pt-4 text-[32px] leading-snug opacity-80 last:pb-10 [&:has(>img)]:contents',
        header: `px-10 pt-8 ${cardHeader}`,
        icon: cardIcon,
        body: cardBody,
        list: `px-10 pb-8 pt-4 last:pb-10 ${cardList}`,
        li: cardItem,
      },
      outline: {
        card: `flex flex-col min-w-0 overflow-hidden rounded-[24px] border-4 border-(--slide-accent) ${span} ${cardRows}`,
        img: 'w-full grow min-h-0 object-cover',
        h1:
          'px-10 pt-8 text-[56px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading) ' +
          'text-balance',
        h2:
          'px-10 pt-8 text-[56px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading) ' +
          'text-balance',
        h3:
          'px-10 pt-8 text-[56px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading) ' +
          'text-balance',
        p: 'px-10 pb-8 pt-4 text-[32px] leading-snug opacity-80 last:pb-10 [&:has(>img)]:contents',
        header: `px-10 pt-8 ${cardHeader}`,
        icon: cardIcon,
        body: cardBody,
        list: `px-10 pb-8 pt-4 last:pb-10 ${cardList}`,
        li: cardItem,
      },
      // No surface of its own: the art and the text sit straight on the slide, for a grid that is all pictures.
      plain: {
        card: `flex flex-col min-w-0 ${span} ${cardRows}`,
        img: 'w-full grow min-h-0 object-contain',
        h1: 'pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading) text-balance',
        h2: 'pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading) text-balance',
        h3: 'pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading) text-balance',
        p: 'pt-4 text-[32px] leading-snug opacity-80 [&:has(>img)]:contents',
        header: `pt-8 ${cardHeader}`,
        icon: cardIcon,
        body: cardBody,
        list: `pt-4 ${cardList}`,
        li: cardItem,
      },
    },
    table: {
      // Rules between rows only, as a printed table sets them.
      rows: {
        table: 'w-full my-[32px] text-[40px] border-collapse',
        th: 'px-6 py-6 border-b-4 border-(--slide-accent) text-left uppercase text-(color:--slide-accent)',
        td: 'px-6 py-6 border-b border-(--slide-separator)',
      },
      cards: {
        table: 'w-full my-[32px] text-[40px] border-separate border-spacing-y-4',
        th: 'px-10 py-4 text-left uppercase text-(color:--slide-accent)',
        td: 'px-10 py-6 bg-(--slide-code) first:rounded-s-[20px] last:rounded-e-[20px]',
      },
      outline: {
        table: 'w-full my-[32px] text-[40px] border-collapse',
        th: 'px-8 py-6 border-4 border-(--slide-accent) text-left uppercase',
        td: 'px-8 py-6 border-4 border-(--slide-accent)',
      },
    },
  } as Record<string, Record<string, Record<string, string> | undefined> | undefined>,

  /** Static `{2,4-5}` line highlights; other lines are dimmed as in Slidev. */
  line: {
    highlighted: 'block bg-hover-surface',
    dimmed: 'block opacity-40',
  },
};
