//
// Copyright 2026 DXOS.org
//

// The tracks a grid child covers. The counts are reset on the child itself rather than left to the `var()`
// fallbacks: a custom property inherits, so a child inside a child would otherwise cover the tracks of the one
// around it. An inline `colSpan`/`rowSpan` outranks the reset.
const span =
  '[--slide-col-span:1] [--slide-row-span:1] ' +
  '[grid-column:span_var(--slide-col-span,1)] [grid-row:span_var(--slide-row-span,1)]';

/** Classes for the 2560×1440 slide canvas (`SlideFrame` scales it to fit); colors and fonts come from `--slide-*` variables. */
export const theme = {
  root: 'leading-relaxed',

  padding: 'px-40 py-16',

  nodes: {
    // Headings set tight, so a title that wraps takes two short lines rather than the body's relaxed spacing.
    h1: 'text-[80px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading)',
    h2: 'text-[60px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading)',
    h3: 'text-[48px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading)',
    h4: 'text-[40px] leading-tight uppercase font-(family-name:--slide-font-heading)',

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
          "after:content-['→'] after:absolute after:start-full after:top-1/2 after:ms-5 after:-translate-y-1/2 " +
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
      // A mark run oversized off the slide's start edge, behind the words. It leaves the flow, so the text is laid
      // out as though it were not there, and it is cropped by the slide rather than fitted to it.
      //
      // It is not tinted down with `opacity`, which would fade the relief with it. `brightness` takes the white mark
      // to the surface's own value, and the two drop-shadows — dark down-end, light up-start — are then the only
      // thing that reads, so the mark looks raised out of the slide rather than laid on it. The offsets are canvas
      // units, scaled with everything else.
      //
      // The mark is drawn high in its own square (21 units of air above it, 218 below), so centring the file centres
      // the air rather than the mark; the nudge is half that difference, as a share of the image's height.
      // A picture that fills its column rather than sitting in it: it grows to the column's height and is cropped
      // to its width, so the mark at the art's centre stays centred however narrow the column is.
      fill: {
        box: 'grow min-h-0 self-stretch flex items-center justify-center overflow-hidden',
        img: 'w-full h-full object-cover',
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
        box: 'absolute start-[53px] top-[577px] flex flex-col gap-[209px]',
        // Important: `cover` and the other emphasis layouts size their headings with a `[&_h1]` descendant rule,
        // which outranks a class on the heading itself, so a variant can only set its own size by overriding it.
        h1: 'text-[208px]! leading-none! font-(family-name:--slide-font-heading) text-(color:--slide-foreground)',
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
          '[grid-template-rows:repeat(var(--slide-grid-rows,1),minmax(0,1fr))] [grid-auto-rows:minmax(0,1fr)]',
      },
    },

    // A cell spans the tracks `cols`/`rows` ask for; with neither it is one cell, as any grid child is.
    cell: {
      default: {
        cell: `min-w-0 ${span}`,
      },
    },

    // A card is a filled surface holding art, a title and a line or two: the brand's own card. The art fills the box:
    // its scale stays even across cards of different widths because each card crop (`brand/backgrounds/cards/`) carries
    // a window of the same height, not because of anything the card does.
    card: {
      default: {
        card: `flex flex-col min-w-0 overflow-hidden rounded-[24px] bg-(--slide-code) ${span}`,
        img: 'w-full grow min-h-0 object-cover',
        h1: 'px-10 pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading)',
        h2: 'px-10 pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading)',
        h3: 'px-10 pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading)',
        p: 'px-10 pb-8 pt-4 text-[32px] leading-snug opacity-80 last:pb-10 [&:has(>img)]:contents',
      },
      outline: {
        card: `flex flex-col min-w-0 overflow-hidden rounded-[24px] border-4 border-(--slide-accent) ${span}`,
        img: 'w-full grow min-h-0 object-cover',
        h1: 'px-10 pt-8 text-[56px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading)',
        h2: 'px-10 pt-8 text-[56px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading)',
        h3: 'px-10 pt-8 text-[56px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading)',
        p: 'px-10 pb-8 pt-4 text-[32px] leading-snug opacity-80 last:pb-10 [&:has(>img)]:contents',
      },
      // No surface of its own: the art and the text sit straight on the slide, for a grid that is all pictures.
      plain: {
        card: `flex flex-col min-w-0 ${span}`,
        img: 'w-full grow min-h-0 object-contain',
        h1: 'pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading)',
        h2: 'pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading)',
        h3: 'pt-8 text-[56px] leading-tight font-(family-name:--slide-font-heading)',
        p: 'pt-4 text-[32px] leading-snug opacity-80 [&:has(>img)]:contents',
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
