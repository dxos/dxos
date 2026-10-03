//
// Copyright 2026 DXOS.org
//

import '../next/theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, {
  type ComponentType,
  Fragment,
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ACCENT_HUES, type AccentHue, accentTokens } from '@dxos/ui-theme';
import { type MessageValence, hues } from '@dxos/ui-types';

import { translations } from '#translations';

import { Next } from '../next/Next.tsx';
import { type Size, SIZES } from '../next/sizes.ts';
import { withTheme } from '../testing/index.ts';

//
// Frame
//

const SizeContext = createContext<Size>('md');

const HUE_OPTIONS: Next.SelectOption[] = ACCENT_HUES.map((hue) => ({
  value: hue,
  label: hue,
  icon: 'ph--circle--fill',
  iconHue: hue,
}));

type SectionProps = PropsWithChildren<{
  id: string;
  title: string;
  /** Caps the section at a form's width, where full-width fields would read poorly. */
  narrow?: boolean;
}>;

/** One component family: a heading over a rail-gutter Container at the frame's size. */
const Section = ({ id, title, narrow, children }: SectionProps) => {
  const size = useContext(SizeContext);
  return (
    <section id={id} data-section={id} className='flex flex-col gap-2 py-4 border-b border-separator'>
      <Next.Typography asChild tone='description' classNames='px-4 font-medium'>
        <h2>{title}</h2>
      </Next.Typography>
      <div className={narrow ? 'max-w-[32rem]' : undefined}>
        <Next.Container size={size} gutter='rail' level='base'>
          {children}
        </Next.Container>
      </div>
    </section>
  );
};

/** A labelled run of controls within a section. */
const Row = ({ label, children }: PropsWithChildren<{ label?: string }>) => (
  <Next.Group>
    {label && (
      <Next.Typography tone='description' classNames='w-24 shrink-0'>
        {label}
      </Next.Typography>
    )}
    {children}
  </Next.Group>
);

type TocEntry = { id: string; title: string };

/** Lists every section; the one nearest the top of the scrolling column is highlighted. */
const Toc = ({
  entries,
  active,
  onSelect,
}: {
  entries: TocEntry[];
  active?: string;
  onSelect: (id: string) => void;
}) => (
  <nav
    aria-label='Contents'
    className='flex flex-col gap-1 w-48 shrink-0 p-4 overflow-y-auto border-s border-separator'
  >
    <Next.Typography tone='subdued'>Contents</Next.Typography>
    {entries.map(({ id, title }) => (
      <Next.Link
        key={id}
        href={`#${id}`}
        target='_self'
        variant={id === active ? 'accent' : 'neutral'}
        aria-current={id === active ? 'location' : undefined}
        classNames={id === active ? 'font-medium' : undefined}
        onClick={(event) => {
          event.preventDefault();
          onSelect(id);
        }}
      >
        {title}
      </Next.Link>
    ))}
  </nav>
);

type SectionDef = TocEntry & { Component: ComponentType };

/** The page: a control bar, the sections in a scrolling column, and a table of contents on the right. */
const Frame = ({ sections }: { sections: SectionDef[] }) => {
  const [hue, setHue] = useState<AccentHue>('blue');
  const [size, setSize] = useState<Size>('md');
  const [active, setActive] = useState<string | undefined>(sections[0]?.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Accent tokens are custom properties, which React's `style` typing does not name.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const tokens = Object.entries(accentTokens(hue));
    tokens.forEach(([property, value]) => frame.style.setProperty(property, value));
    return () => tokens.forEach(([property]) => frame.style.removeProperty(property));
  }, [hue]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-section');
          if (id) {
            entry.isIntersecting ? visible.add(id) : visible.delete(id);
          }
        });
        // The last in the band: the section above one scrolled to the top still touches it at its edge.
        const current = sections.findLast(({ id }) => visible.has(id));
        if (current) {
          setActive(current.id);
        }
      },
      // Only the top band of the column counts, so the highlighted section is the one being read.
      { root, rootMargin: '0px 0px -70% 0px' },
    );
    root.querySelectorAll('[data-section]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  const handleSelect = (id: string) => {
    const root = scrollRef.current;
    const section = root?.querySelector(`[data-section="${id}"]`);
    if (!root || !section) {
      return;
    }
    // Scrolls only the column: `scrollIntoView` would also scroll the story's own document.
    const top = section.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
    root.scrollTo({ top, behavior: 'smooth' });
    setActive(id);
  };

  return (
    <Next.Toast.Provider>
      <div ref={frameRef} className='flex flex-col h-dvh bg-base-surface'>
        <div className='nx-scope shrink-0 border-b border-separator' data-size='md'>
          <Next.Container gutter='rail' level='base'>
            <Next.Toolbar.Root>
              <Next.Toolbar.Text>Accent</Next.Toolbar.Text>
              <Next.Select.Root
                items={HUE_OPTIONS}
                value={[hue]}
                onValueChange={({ value }) => {
                  const next = ACCENT_HUES.find((option) => option === value[0]);
                  if (next) {
                    setHue(next);
                  }
                }}
              >
                <Next.Select.Trigger fit='options' aria-label='Accent hue' />
                <Next.Select.Content>
                  {HUE_OPTIONS.map((item) => (
                    <Next.Select.Item key={item.value} item={item} />
                  ))}
                </Next.Select.Content>
              </Next.Select.Root>
              <Next.Toolbar.Separator />
              <Next.Toolbar.Text>Size</Next.Toolbar.Text>
              <Next.Toolbar.ToggleGroup
                type='single'
                value={size}
                onValueChange={(next) => {
                  const selected = SIZES.find((option) => option === next);
                  if (selected) {
                    setSize(selected);
                  }
                }}
                aria-label='Size'
              >
                {SIZES.map((option) => (
                  <Next.ToggleGroup.Item key={option} value={option}>
                    {option}
                  </Next.ToggleGroup.Item>
                ))}
              </Next.Toolbar.ToggleGroup>
            </Next.Toolbar.Root>
          </Next.Container>
        </div>
        <div className='flex dx-grow'>
          {/* `relative` contains the controls' visually hidden native inputs, which would otherwise scroll the document. */}
          <div ref={scrollRef} className='nx-scope @container relative grow overflow-y-auto' data-size={size}>
            <SizeContext.Provider value={size}>
              {sections.map(({ id, Component }) => (
                <Component key={id} />
              ))}
            </SizeContext.Provider>
          </div>
          <Toc entries={sections} active={active} onSelect={handleSelect} />
        </div>
      </div>
      <Next.Toast.Toaster size={size} />
    </Next.Toast.Provider>
  );
};

//
// Sections
//

const BUTTON_VARIANTS: Next.ButtonVariant[] = ['default', 'primary', 'outline', 'ghost', 'destructive'];
const VALENCES: MessageValence[] = ['neutral', 'info', 'success', 'warning', 'error'];

const ButtonSection = () => (
  <Section id='button' title='Button'>
    {BUTTON_VARIANTS.map((variant) => (
      <Row key={variant} label={variant}>
        <Next.Button variant={variant}>Button</Next.Button>
        <Next.Button variant={variant} icon='ph--paper-plane-tilt--regular'>
          With icon
        </Next.Button>
        <Next.Button variant={variant} disabled>
          Disabled
        </Next.Button>
        <Next.Button variant={variant} icon='ph--gear--regular' label='Settings' iconOnly />
        <Next.Button variant={variant} iconEnd='ph--caret-down--regular' label='More' />
      </Row>
    ))}
    <Row label='valence'>
      {VALENCES.map((valence) => (
        <Next.Button key={valence} variant='valence' valence={valence}>
          {valence}
        </Next.Button>
      ))}
    </Row>
    <Row label='toggle'>
      <Next.Toggle icon='ph--text-b--regular' label='Bold' iconOnly />
      <Next.Toggle icon='ph--text-italic--regular' label='Italic' iconOnly defaultPressed />
      <Next.Toggle icon='ph--text-underline--regular' label='Underline' iconOnly disabled />
      <Next.Toggle icon='ph--star--regular' activeIcon='ph--star--fill' label='Pin' iconOnly />
      <Next.ToggleGroup.Root type='single' defaultValue='left' aria-label='Alignment'>
        <Next.ToggleGroup.Item value='left' icon='ph--text-align-left--regular' label='Left' iconOnly />
        <Next.ToggleGroup.Item value='center' icon='ph--text-align-center--regular' label='Centre' iconOnly />
        <Next.ToggleGroup.Item value='right' icon='ph--text-align-right--regular' label='Right' iconOnly />
      </Next.ToggleGroup.Root>
      <Next.ToggleGroup.Root type='multiple' defaultValue={['bold']} aria-label='Marks'>
        <Next.ToggleGroup.Item value='bold'>Bold</Next.ToggleGroup.Item>
        <Next.ToggleGroup.Item value='italic'>Italic</Next.ToggleGroup.Item>
        <Next.ToggleGroup.Item value='code' disabled>
          Code
        </Next.ToggleGroup.Item>
      </Next.ToggleGroup.Root>
    </Row>
    <Row label='menu'>
      <MenuButtonDemo />
    </Row>
    <Row label='system'>
      <Next.SystemButton.Add />
      <Next.SystemButton.Edit />
      <Next.SystemButton.Delete />
      <Next.SystemButton.Star />
      <Next.SystemButton.Bookmark />
      <Next.SystemButton.Clipboard value='Copied from the playground' />
      <Next.SystemButton.Ai />
      <Next.SystemButton.Close />
      <Next.SystemButton.Save iconOnly={false} />
      <Next.SystemButton.Cancel iconOnly={false} />
    </Row>
  </Section>
);

const MenuButtonDemo = () => {
  const [view, setView] = useState('List');
  const [extraction, setExtraction] = useState(false);
  const items: Next.MenuButtonItem[] = [
    { type: 'group', label: 'View' },
    ...['List', 'Grid', 'Board'].map((label): Next.MenuButtonItem => ({
      type: 'option',
      label,
      selected: view === label,
      onSelect: () => setView(label),
    })),
    { type: 'separator' },
    { type: 'checkbox', label: 'Entity extraction', checked: extraction, onCheckedChange: setExtraction },
  ];
  return (
    <>
      <Next.MenuButton icon='ph--sliders--regular' iconOnly caretDown label='Options' items={items} />
      <Next.Typography tone='description'>
        {view} · extraction {extraction ? 'on' : 'off'}
      </Next.Typography>
    </>
  );
};

const InputSection = () => (
  <Section id='input' title='Input' narrow>
    <Next.Field.Root>
      <Next.Field.Label>Name</Next.Field.Label>
      <Next.Input placeholder='Ada Lovelace' />
      <Next.Field.HelperText>Shown to other members.</Next.Field.HelperText>
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Search</Next.Field.Label>
      <Next.Input start={<Next.Icon icon='ph--magnifying-glass--regular' />} placeholder='Find…' />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Workspace</Next.Field.Label>
      <Next.Input end='.dxos.org' placeholder='workspace' />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Subdued</Next.Field.Label>
      <Next.Input variant='subdued' placeholder='No well' />
    </Next.Field.Root>
    <Next.Field.Root readOnly>
      <Next.Field.Label>Identity</Next.Field.Label>
      <Next.Input variant='mono' copyable defaultValue='did:key:z6Mk' />
    </Next.Field.Root>
    <Next.Field.Root disabled>
      <Next.Field.Label>Disabled</Next.Field.Label>
      <Next.Input defaultValue='Locked' />
    </Next.Field.Root>
    {(['success', 'info', 'warning', 'error'] as const).map((valence) => (
      <Next.Field.Root key={valence} validationValence={valence}>
        <Next.Field.Label>Handle ({valence})</Next.Field.Label>
        <Next.Input defaultValue='dxos' />
        <Next.Field.HelperText>A {valence} message.</Next.Field.HelperText>
      </Next.Field.Root>
    ))}
    <Next.Field.Root invalid>
      <Next.Field.Label>Website</Next.Field.Label>
      <Next.Input defaultValue='not a url' />
      <Next.Field.ErrorText>Enter a valid URL.</Next.Field.ErrorText>
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Notes</Next.Field.Label>
      <Next.Textarea autoResize placeholder='Grows as you type' />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Password</Next.Field.Label>
      <Next.PasswordInput defaultValue='hunter2' autoComplete='current-password' />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Quantity</Next.Field.Label>
      <Next.NumberInput min={0} max={10} defaultValue='8' />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Price</Next.Field.Label>
      <Next.NumberInput defaultValue='1250' step={0.5} formatOptions={{ style: 'currency', currency: 'USD' }} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Code</Next.Field.Label>
      <Next.PinInput length={4} />
    </Next.Field.Root>
    <Next.Field.Root invalid>
      <Next.Field.Label>Expired</Next.Field.Label>
      <Next.PinInput length={4} type='alphanumeric' defaultValue='AB12' />
      <Next.Field.ErrorText>The code has expired.</Next.Field.ErrorText>
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Due</Next.Field.Label>
      <Next.DateInput defaultValue='2026-09-29' />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Starts at</Next.Field.Label>
      <Next.DateInput type='time' defaultValue='09:30' />
    </Next.Field.Root>
    <Next.Field.Root readOnly>
      <Next.Field.Label>Meeting</Next.Field.Label>
      <Next.DateInput type='datetime-local' defaultValue='2026-09-29T14:00' />
    </Next.Field.Root>
  </Section>
);

const CheckboxSection = () => (
  <Section id='checkbox' title='Checkbox, switch'>
    <Next.Checkbox label='Subscribe' defaultChecked />
    <Next.Checkbox label='Some selected' checked='indeterminate' />
    <Next.Checkbox label='Disabled' disabled />
    <Next.Switch label='Notifications' defaultChecked />
    <Next.Switch label='Disabled' disabled />
  </Section>
);

const COLORS: Next.SelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'black', label: 'Black', disabled: true },
];

const VIEWS: Next.SelectOption[] = [
  { value: 'list', label: 'List', icon: 'ph--list--regular' },
  { value: 'grid', label: 'Grid', icon: 'ph--squares-four--regular' },
  { value: 'table', label: 'Table', icon: 'ph--table--regular' },
];

const PEOPLE: Next.ComboboxOption[] = [
  { value: 'alice', label: 'Alice Green', icon: 'ph--user--regular' },
  { value: 'bob', label: 'Bob Grey', icon: 'ph--user--regular' },
  { value: 'carol', label: 'Carol Black', icon: 'ph--user--regular' },
  { value: 'dan', label: 'Dan Brown', icon: 'ph--user--regular', disabled: true },
];

const SelectSection = () => (
  <Section id='select' title='Select, combobox' narrow>
    <Next.Field.Root>
      <Next.Select.Root items={COLORS}>
        <Next.Select.Label>Color</Next.Select.Label>
        <Next.Select.Trigger placeholder='Pick a color' />
        <Next.Select.Content>
          {COLORS.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Select.Root items={VIEWS} defaultValue={['grid']}>
        <Next.Select.Label>View</Next.Select.Label>
        <Next.Select.Trigger />
        <Next.Select.Content>
          {VIEWS.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Select.Root items={COLORS} multiple>
        <Next.Select.Label>Colors</Next.Select.Label>
        <Next.Select.Trigger placeholder='Several' />
        <Next.Select.Content>
          {COLORS.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Combobox.Root items={PEOPLE}>
        <Next.Combobox.Label>Owner</Next.Combobox.Label>
        <Next.Combobox.Control>
          <Next.Combobox.Input placeholder='Search people' />
          <Next.Combobox.ClearTrigger aria-label='Clear owner' />
          <Next.Combobox.Trigger />
        </Next.Combobox.Control>
        <Next.Combobox.Content />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Combobox.Root items={PEOPLE}>
        <Next.Combobox.Label>Reviewer</Next.Combobox.Label>
        <Next.Combobox.Trigger placeholder='Pick a person' />
        <Next.Combobox.Content />
      </Next.Combobox.Root>
    </Next.Field.Root>
  </Section>
);

const SliderSection = () => {
  const [value, setValue] = useState([40]);
  return (
    <Section id='slider' title='Slider' narrow>
      <Next.Slider value={value} onValueChange={setValue} max={100} label='Volume' />
      <Next.Slider defaultValue={[25, 75]} max={100} thumbLabels={['Minimum', 'Maximum']} label='Price' />
      <Next.Slider defaultValue={[50]} max={100} disabled aria-label='Disabled value' />
    </Section>
  );
};

const STEPS = ['Plan', 'Build', 'Verify', 'Ship'].map((label) => ({ id: label, label }));

const ProgressSection = () => (
  <Section id='progress' title='Progress, steps' narrow>
    <Next.Progress value={0.35} label='Upload' />
    <Next.Progress indeterminate label='Indexing' />
    <Next.Progress indeterminate error label='Failed' />
    <Next.Steps steps={STEPS} active={1} fraction={0.5} />
  </Section>
);

const TagSection = () => (
  <Section id='tag' title='Tag'>
    <Next.Group>
      {[...VALENCES, ...hues].map((hue) => (
        <Next.Tag key={hue} hue={hue}>
          {hue}
        </Next.Tag>
      ))}
    </Next.Group>
  </Section>
);

const AvatarSection = () => (
  <Section id='avatar' title='Avatar'>
    <Next.Group>
      <Next.Avatar.Root fallback='Ada Lovelace' hue='blue' status='current' label='Ada Lovelace' />
      <Next.Avatar.Root fallback='🦊' hue='amber' label='Fox' />
      <Next.Avatar.Root fallback='Bob' hue='rose' variant='square' status='inactive' label='Bob' />
      <Next.Avatar.Root icon='ph--robot--regular' hue='violet' hueVariant='surface' label='Agent' />
      <Next.Avatar.Root fallback='Eve' hue='teal' hueVariant='transparent' status='error' label='Eve' />
    </Next.Group>
  </Section>
);

const SkeletonSection = () => (
  <Section id='skeleton' title='Skeleton' narrow>
    <div className='flex gap-2'>
      <Next.Skeleton variant='circle' />
      <div className='flex flex-col grow'>
        <Next.Skeleton variant='text' classNames='w-2/3' />
        <Next.Skeleton variant='text' classNames='w-1/3' />
      </div>
    </div>
    <Next.Skeleton />
  </Section>
);

const TRAIL = ['Home', 'Projects', 'Composer'];

const NavigationSection = () => (
  <Section id='navigation' title='Breadcrumb, link, separator'>
    <Next.Breadcrumb.Root aria-label='Location'>
      <Next.Breadcrumb.List>
        {TRAIL.map((step) => (
          <Fragment key={step}>
            <Next.Breadcrumb.Item>
              <Next.Breadcrumb.Link href='#'>{step}</Next.Breadcrumb.Link>
            </Next.Breadcrumb.Item>
            <Next.Breadcrumb.Separator />
          </Fragment>
        ))}
        <Next.Breadcrumb.Item>
          <Next.Breadcrumb.Current>Design review</Next.Breadcrumb.Current>
        </Next.Breadcrumb.Item>
      </Next.Breadcrumb.List>
    </Next.Breadcrumb.Root>
    <Next.Typography>
      Read the <Next.Link href='https://dxos.org'>guide</Next.Link>, or the{' '}
      <Next.Link href='https://github.com/dxos/dxos/releases' variant='neutral'>
        release notes
      </Next.Link>
      .
    </Next.Typography>
    <Next.Separator />
    <Next.Group>
      <Next.Button>Left</Next.Button>
      <Next.Separator orientation='vertical' />
      <Next.Button>Middle</Next.Button>
      <Next.Separator orientation='vertical' decorative />
      <Next.Button>Right</Next.Button>
    </Next.Group>
  </Section>
);

const TabsSection = () => (
  <Section id='tabs' title='Tabs' narrow>
    <Next.Tabs.Root defaultValue='overview' classNames='h-40'>
      <Next.Tabs.List aria-label='Project'>
        <Next.Tabs.Trigger value='overview' label='Overview' />
        <Next.Tabs.Trigger value='tasks' icon='ph--check-square--regular' label='Tasks' />
        <Next.Tabs.Trigger value='settings' icon='ph--gear--regular' label='Settings' iconOnly />
      </Next.Tabs.List>
      <Next.Tabs.Content value='overview'>
        <Next.Typography>A summary of the project.</Next.Typography>
      </Next.Tabs.Content>
      <Next.Tabs.Content value='tasks'>
        <Next.Typography>Three open tasks.</Next.Typography>
      </Next.Tabs.Content>
      <Next.Tabs.Content value='settings'>
        <Next.Input aria-label='Name' defaultValue='Apollo' />
      </Next.Tabs.Content>
    </Next.Tabs.Root>
  </Section>
);

const ToolbarSection = () => (
  <Section id='toolbar' title='Toolbar'>
    <Next.Toolbar.Root>
      <Next.Button icon='ph--arrow-counter-clockwise--regular' label='Undo' iconOnly />
      <Next.Button icon='ph--arrow-clockwise--regular' label='Redo' iconOnly />
      <Next.Toolbar.Separator />
      <Next.Toolbar.ToggleGroup type='multiple' aria-label='Marks'>
        <Next.ToggleGroup.Item value='bold' icon='ph--text-b--regular' label='Bold' iconOnly />
        <Next.ToggleGroup.Item value='italic' icon='ph--text-italic--regular' label='Italic' iconOnly />
        <Next.ToggleGroup.Item value='underline' icon='ph--text-underline--regular' label='Underline' iconOnly />
      </Next.Toolbar.ToggleGroup>
      <Next.Toolbar.Separator />
      <Next.Input placeholder='Search' aria-label='Search' />
      <Next.Toolbar.Separator variant='gap' />
      <Next.Button variant='primary'>Publish</Next.Button>
    </Next.Toolbar.Root>
    <Next.Toolbar.Root>
      <Next.DragHandle label='Drag' />
      <Next.Toolbar.Text>A document title long enough to be truncated by the toolbar</Next.Toolbar.Text>
      <Next.Toolbar.Link href='https://dxos.org'>Docs</Next.Toolbar.Link>
      <Next.Button>Share</Next.Button>
    </Next.Toolbar.Root>
  </Section>
);

const EditableSection = () => {
  const [value, setValue] = useState('Ship the spring release');
  return (
    <Section id='editable' title='Editable' narrow>
      <Next.Editable.Root value={value} onValueChange={setValue} placeholder='Untitled'>
        <Next.Editable.Preview aria-label='Title' />
        <Next.Editable.Input />
      </Next.Editable.Root>
    </Section>
  );
};

const ACCORDION_ITEMS = [
  { value: 'search', icon: 'ph--magnifying-glass--regular', label: 'Search the web', detail: '12 results for "zag"' },
  { value: 'read', icon: 'ph--file-text--regular', label: 'Read a document', detail: 'Read DESIGN.md (673 lines)' },
];

const CollapsibleSection = () => (
  <Section id='collapsible' title='Collapsible, accordion' narrow>
    <Next.Collapsible.Root>
      <Next.Collapsible.Trigger>Advanced settings</Next.Collapsible.Trigger>
      <Next.Collapsible.Content>
        <Next.Typography>These settings change how your space syncs.</Next.Typography>
        <Next.Switch label='Sync over cellular' />
      </Next.Collapsible.Content>
    </Next.Collapsible.Root>
    <Next.Accordion.Root border multiple>
      {ACCORDION_ITEMS.map(({ value, icon, label, detail }) => (
        <Next.Accordion.Item key={value} value={value}>
          <Next.Accordion.ItemTrigger icon={icon}>{label}</Next.Accordion.ItemTrigger>
          <Next.Accordion.ItemContent>
            <Next.Typography>{detail}</Next.Typography>
          </Next.Accordion.ItemContent>
        </Next.Accordion.Item>
      ))}
    </Next.Accordion.Root>
  </Section>
);

const CardSection = () => (
  <Section id='card' title='Card'>
    <div className='grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] items-start gap-4'>
      <Next.Card.Root>
        <Next.Card.Header>
          <Next.Card.Title>Roadmap</Next.Card.Title>
          <Next.Button icon='ph--dots-three--regular' label='More actions' iconOnly />
        </Next.Card.Header>
        <Next.Card.Body>
          <Next.Card.Description>What ships next quarter and why.</Next.Card.Description>
          <Next.Typography>Three milestones, each with an owner and a date.</Next.Typography>
        </Next.Card.Body>
        <Next.Card.Footer>
          <Next.Button>Dismiss</Next.Button>
          <Next.Button variant='primary'>Review</Next.Button>
        </Next.Card.Footer>
      </Next.Card.Root>
      <Next.Card.Root grid>
        <Next.Card.Header>
          <Next.Card.Title>Project</Next.Card.Title>
          <Next.Card.Action system='close' />
        </Next.Card.Header>
        <Next.Card.Section title='Members'>
          <Next.Card.Row icon='ph--user--regular' trailing={<Next.Tag hue='emerald'>Owner</Next.Tag>}>
            Ada Lovelace
          </Next.Card.Row>
          <Next.Card.Row icon='ph--user--regular' trailing={<Next.Card.Action icon='ph--x--regular' label='Remove' />}>
            Charles Babbage
          </Next.Card.Row>
        </Next.Card.Section>
        <Next.Card.Section>
          <Next.Card.Text variant='description'>Updated today.</Next.Card.Text>
        </Next.Card.Section>
      </Next.Card.Root>
    </div>
  </Section>
);

const BannerSection = () => (
  <Section id='banner' title='Banner' narrow>
    <Next.Container gap='md'>
      {VALENCES.map((valence) => (
        <Next.Banner.Root key={valence} valence={valence}>
          <Next.Banner.Title>{valence}</Next.Banner.Title>
          <Next.Banner.Body>A banner with the {valence} valence.</Next.Banner.Body>
        </Next.Banner.Root>
      ))}
    </Next.Container>
  </Section>
);

const SLIDE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const SLIDES = SLIDE_COLORS.map(
  (color, index) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='640' height='360' fill='${color}'/><text x='320' y='200' font-size='64' text-anchor='middle' fill='white'>${index + 1}</text></svg>`,
    )}`,
);

const CarouselSection = () => (
  <Section id='carousel' title='Carousel' narrow>
    <Next.Carousel.Root count={SLIDES.length} continuous>
      <Next.Carousel.PrevTrigger />
      <Next.Carousel.ItemGroup>
        {SLIDES.map((src, index) => (
          <Next.Carousel.Item key={src} index={index} src={src} alt={`Slide ${index + 1}`} />
        ))}
      </Next.Carousel.ItemGroup>
      <Next.Carousel.NextTrigger />
      <Next.Carousel.IndicatorGroup />
      <Next.Carousel.Caption>{(page) => `Slide ${page + 1} of ${SLIDES.length}`}</Next.Carousel.Caption>
    </Next.Carousel.Root>
  </Section>
);

const SplitterSection = () => {
  const [size, setSize] = useState(12);
  return (
    <Section id='splitter' title='Splitter'>
      <div className='flex flex-col h-40 border border-separator'>
        <Next.Splitter.Root orientation='horizontal' resizable minSize={6} size={size} onSizeChange={setSize}>
          <Next.Splitter.Panel position='start'>
            <Next.Typography tone='description' classNames='p-2'>
              Drag the seam.
            </Next.Typography>
          </Next.Splitter.Panel>
          <Next.Splitter.ResizeTrigger aria-label='Resize' />
          <Next.Splitter.Panel position='end'>
            <Next.Typography tone='description' classNames='p-2'>
              {size.toFixed(1)}rem
            </Next.Typography>
          </Next.Splitter.Panel>
        </Next.Splitter.Root>
      </div>
    </Section>
  );
};

const SCROLL_ROWS = Array.from({ length: 24 }, (_, index) => `Row ${index + 1}`);
const SCROLL_TAGS = Array.from({ length: 16 }, (_, index) => `Tag ${index + 1}`);

const ScrollAreaSection = () => (
  <Section id='scroll-area' title='Scroll area'>
    <div className='flex flex-col h-40 w-[26rem] border border-separator'>
      <Next.ScrollArea.Root classNames='flex-1'>
        <Next.ScrollArea.Viewport asChild>
          <Next.Container gutter='rail'>
            {SCROLL_ROWS.map((row) => (
              <Next.Typography key={row}>{row}</Next.Typography>
            ))}
          </Next.Container>
        </Next.ScrollArea.Viewport>
      </Next.ScrollArea.Root>
    </div>
    <Next.ScrollArea.Root orientation='horizontal' snap autoHide classNames='w-[26rem]'>
      <Next.ScrollArea.Viewport>
        <div className='flex w-max gap-2 py-2'>
          {SCROLL_TAGS.map((tag) => (
            <Next.Tag key={tag} hue='sky' classNames='snap-start'>
              {tag}
            </Next.Tag>
          ))}
        </div>
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  </Section>
);

const QrCodeSection = () => (
  <Section id='qr-code' title='QR code'>
    <div className='grid grid-cols-[repeat(2,8rem)] gap-8 text-description'>
      <Next.QrCode value='https://dxos.org' icon='ph--planet--regular' label='DXOS' />
      <Next.QrCode value='https://composer.space' errorCorrection='H' label='Composer' />
    </div>
  </Section>
);

const MINUTES = [0, 1, 42, 5 * 60, 26 * 60, 40 * 24 * 60];

const TimestampSection = () => {
  const [now] = useState(() => new Date());
  return (
    <Section id='timestamp' title='Timestamp'>
      <Next.Group>
        {MINUTES.map((minutes) => (
          <Next.Timestamp key={minutes} date={new Date(now.getTime() - minutes * 60_000)} />
        ))}
      </Next.Group>
    </Section>
  );
};

const MENU_ITEMS = [
  { value: 'cut', label: 'Cut', icon: 'ph--scissors--regular', shortcut: '⌘X' },
  { value: 'copy', label: 'Copy', icon: 'ph--copy--regular', shortcut: '⌘C' },
  { value: 'paste', label: 'Paste', icon: 'ph--clipboard--regular', shortcut: '⌘V' },
];

const OverlaysSection = () => {
  const [grid, setGrid] = useState(true);
  return (
    <Section id='overlays' title='Tooltip, popover, hover card, menu'>
      <Next.Group>
        <Next.Tooltip.Root>
          <Next.Tooltip.Trigger asChild>
            <Next.Button>Tooltip</Next.Button>
          </Next.Tooltip.Trigger>
          <Next.Tooltip.Content>Save changes (⌘S)</Next.Tooltip.Content>
        </Next.Tooltip.Root>
        <Next.Popover.Root>
          <Next.Popover.Trigger asChild>
            <Next.Button>Popover</Next.Button>
          </Next.Popover.Trigger>
          <Next.Popover.Content>
            <Next.Popover.Header>
              <Next.Popover.Title>Share space</Next.Popover.Title>
              <Next.Popover.CloseTrigger />
            </Next.Popover.Header>
            <Next.Popover.Description>Anyone with the link can view.</Next.Popover.Description>
            <Next.Field.Root>
              <Next.Field.Label>Link</Next.Field.Label>
              <Next.Input defaultValue='https://composer.space/s/123' readOnly />
            </Next.Field.Root>
          </Next.Popover.Content>
        </Next.Popover.Root>
        <Next.HoverCard.Root>
          <Next.HoverCard.Trigger asChild>
            <Next.Button>Hover card</Next.Button>
          </Next.HoverCard.Trigger>
          <Next.HoverCard.Content>
            <Next.Typography>Alice Example</Next.Typography>
            <Next.Typography tone='description'>Joined in March · 12 spaces</Next.Typography>
          </Next.HoverCard.Content>
        </Next.HoverCard.Root>
        <Next.Menu.Root>
          <Next.Menu.Trigger asChild>
            <Next.Button>Menu</Next.Button>
          </Next.Menu.Trigger>
          <Next.Menu.Content>
            <Next.Menu.ItemGroup>
              <Next.Menu.ItemGroupLabel>Edit</Next.Menu.ItemGroupLabel>
              {MENU_ITEMS.map((item) => (
                <Next.Menu.Item key={item.value} item={item} />
              ))}
            </Next.Menu.ItemGroup>
            <Next.Menu.Separator />
            <Next.Menu.CheckboxItem
              item={{ value: 'grid', label: 'Show grid' }}
              checked={grid}
              onCheckedChange={setGrid}
            />
            <Next.Menu.Sub>
              <Next.Menu.TriggerItem item={{ label: 'Share', icon: 'ph--share--regular' }} />
              <Next.Menu.Content>
                <Next.Menu.Item item={{ value: 'email', label: 'Email' }} />
                <Next.Menu.Item item={{ value: 'link', label: 'Copy link' }} />
              </Next.Menu.Content>
            </Next.Menu.Sub>
          </Next.Menu.Content>
        </Next.Menu.Root>
        <Next.Menu.Root>
          <Next.Menu.ContextTrigger asChild>
            <Next.Typography tone='description' classNames='px-3 border border-dashed border-separator rounded-sm'>
              Right-click here
            </Next.Typography>
          </Next.Menu.ContextTrigger>
          <Next.Menu.Content>
            <Next.Menu.Item item={{ value: 'rename', label: 'Rename' }} />
          </Next.Menu.Content>
        </Next.Menu.Root>
      </Next.Group>
    </Section>
  );
};

const DialogsSection = () => {
  const [toast, setToast] = useState(false);
  return (
    <Section id='dialogs' title='Dialog, alert dialog, toast'>
      <Next.Group>
        <Next.Dialog.Root>
          <Next.Dialog.Trigger asChild>
            <Next.Button>Dialog</Next.Button>
          </Next.Dialog.Trigger>
          <Next.Dialog.Content>
            <Next.Dialog.Header>
              <Next.Dialog.Title>Edit profile</Next.Dialog.Title>
              <Next.Dialog.CloseTrigger />
            </Next.Dialog.Header>
            <Next.Dialog.Body>
              <Next.Dialog.Description>Update how others see you.</Next.Dialog.Description>
              <Next.Field.Root>
                <Next.Field.Label>Name</Next.Field.Label>
                <Next.Input placeholder='Ada Lovelace' />
              </Next.Field.Root>
            </Next.Dialog.Body>
            <Next.Dialog.Footer>
              <Next.Dialog.CloseTrigger asChild>
                <Next.SystemButton.Cancel iconOnly={false} />
              </Next.Dialog.CloseTrigger>
              <Next.SystemButton.Save iconOnly={false} />
            </Next.Dialog.Footer>
          </Next.Dialog.Content>
        </Next.Dialog.Root>
        <Next.AlertDialog.Root>
          <Next.AlertDialog.Trigger asChild>
            <Next.Button variant='destructive'>Delete space</Next.Button>
          </Next.AlertDialog.Trigger>
          <Next.AlertDialog.Content>
            <Next.AlertDialog.Header>
              <Next.AlertDialog.Title>Delete space?</Next.AlertDialog.Title>
            </Next.AlertDialog.Header>
            <Next.AlertDialog.Body>
              <Next.AlertDialog.Description>Its objects are removed for every member.</Next.AlertDialog.Description>
            </Next.AlertDialog.Body>
            <Next.AlertDialog.Footer>
              <Next.AlertDialog.Cancel>Cancel</Next.AlertDialog.Cancel>
              <Next.AlertDialog.Action variant='destructive'>Delete</Next.AlertDialog.Action>
            </Next.AlertDialog.Footer>
          </Next.AlertDialog.Content>
        </Next.AlertDialog.Root>
        <Next.Button onClick={() => setToast(true)}>Toast</Next.Button>
      </Next.Group>
      <Next.Toast.Root open={toast} duration={6_000} onOpenChange={setToast}>
        <Next.Toast.Header icon='ph--sparkle--regular'>Saved</Next.Toast.Header>
        <Next.Toast.Description>The bar counts down to when this closes.</Next.Toast.Description>
        <Next.Toast.Footer>
          <Next.Toast.ActionTrigger onClick={() => setToast(false)}>Undo</Next.Toast.ActionTrigger>
        </Next.Toast.Footer>
      </Next.Toast.Root>
    </Section>
  );
};

const EmptySection = () => (
  <Section id='empty' title='Empty' narrow>
    <Next.Empty />
    <Next.Empty icon='ph--tray--regular'>No documents yet</Next.Empty>
  </Section>
);

//
// Stories
//

const SECTIONS: SectionDef[] = [
  { id: 'button', title: 'Button', Component: ButtonSection },
  { id: 'input', title: 'Input', Component: InputSection },
  { id: 'checkbox', title: 'Checkbox, switch', Component: CheckboxSection },
  { id: 'select', title: 'Select, combobox', Component: SelectSection },
  { id: 'slider', title: 'Slider', Component: SliderSection },
  { id: 'progress', title: 'Progress, steps', Component: ProgressSection },
  { id: 'tag', title: 'Tag', Component: TagSection },
  { id: 'avatar', title: 'Avatar', Component: AvatarSection },
  { id: 'skeleton', title: 'Skeleton', Component: SkeletonSection },
  { id: 'navigation', title: 'Breadcrumb, link', Component: NavigationSection },
  { id: 'tabs', title: 'Tabs', Component: TabsSection },
  { id: 'toolbar', title: 'Toolbar', Component: ToolbarSection },
  { id: 'editable', title: 'Editable', Component: EditableSection },
  { id: 'collapsible', title: 'Collapsible, accordion', Component: CollapsibleSection },
  { id: 'card', title: 'Card', Component: CardSection },
  { id: 'banner', title: 'Banner', Component: BannerSection },
  { id: 'carousel', title: 'Carousel', Component: CarouselSection },
  { id: 'splitter', title: 'Splitter', Component: SplitterSection },
  { id: 'scroll-area', title: 'Scroll area', Component: ScrollAreaSection },
  { id: 'qr-code', title: 'QR code', Component: QrCodeSection },
  { id: 'timestamp', title: 'Timestamp', Component: TimestampSection },
  { id: 'overlays', title: 'Overlays', Component: OverlaysSection },
  { id: 'dialogs', title: 'Dialogs, toast', Component: DialogsSection },
  { id: 'empty', title: 'Empty', Component: EmptySection },
];

const meta = {
  title: 'ui/react-ui-core/playground/Playground',
  decorators: [withTheme()],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const All: Story = {
  render: () => <Frame sections={SECTIONS} />,
};
