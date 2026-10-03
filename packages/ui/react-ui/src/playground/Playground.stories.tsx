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

import {
  Accordion,
  AlertDialog,
  Avatar,
  Banner,
  Breadcrumb,
  Button,
  type ButtonVariant,
  Card,
  Carousel,
  Checkbox,
  Collapsible,
  Combobox,
  type ComboboxOption,
  Container,
  DateInput,
  Dialog,
  DragHandle,
  Editable,
  Empty,
  Field,
  Group,
  HoverCard,
  Icon,
  Input,
  Link,
  Menu,
  MenuButton,
  type MenuButtonItem,
  NumberInput,
  Panel,
  PasswordInput,
  PinInput,
  Popover,
  Progress,
  QrCode,
  ScrollArea,
  Select,
  type SelectOption,
  Separator,
  Skeleton,
  Slider,
  Splitter,
  Steps,
  Switch,
  SystemButton,
  Tabs,
  Tag,
  Textarea,
  Timestamp,
  Toast,
  Toggle,
  ToggleGroup,
  Toolbar,
  Tooltip,
  Typography,
} from '../next/components/index.ts';
import { type Size, SIZES } from '../next/sizes.ts';
import { withTheme } from '../testing/index.ts';

//
// Frame
//

const SizeContext = createContext<Size>('md');

type SectionProps = PropsWithChildren<{
  id: string;
  title: string;
}>;

/** One component family: a heading over a rail-gutter Container at the frame's size. */
const Section = ({ id, title, children }: SectionProps) => {
  const size = useContext(SizeContext);
  return (
    <section id={id} data-section={id} className='flex flex-col gap-2 m-4 py-4 border border-separator rounded-md'>
      <Typography asChild tone='description' classNames='px-4 font-medium'>
        <h2>{title}</h2>
      </Typography>
      <Container size={size} gutter='rail' gap='md' level='base'>
        {children}
      </Container>
    </section>
  );
};

/** A labelled run of controls within a section. */
const Row = ({ label, children }: PropsWithChildren<{ label?: string }>) => (
  <Group>
    {label && (
      <Typography tone='description' classNames='w-24 shrink-0'>
        {label}
      </Typography>
    )}
    {children}
  </Group>
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
    <Typography tone='subdued'>Contents</Typography>
    {entries.map(({ id, title }) => (
      <Link
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
      </Link>
    ))}
  </nav>
);

type SectionDef = TocEntry & { Component: ComponentType };

type FrameProps = {
  sections: SectionDef[];
  hue: AccentHue;
  size: Size;
};

/** The page: a document-width Panel scrolling the sections, with a table of contents beside it. */
const Frame = ({ sections, hue, size }: FrameProps) => {
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
    <Toast.Provider>
      <div ref={frameRef} className='flex h-dvh'>
        <Panel.Root size={size} width='document' classNames='grow min-w-0'>
          <Panel.Body asChild>
            <ScrollArea.Root>
              {/* `relative` contains the controls' visually hidden native inputs, which would otherwise scroll the document. */}
              <ScrollArea.Viewport ref={scrollRef} classNames='relative'>
                <SizeContext.Provider value={size}>
                  {sections.map(({ id, Component }) => (
                    <Component key={id} />
                  ))}
                </SizeContext.Provider>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Panel.Body>
        </Panel.Root>
        <Toc entries={sections} active={active} onSelect={handleSelect} />
      </div>
      <Toast.Toaster size={size} />
    </Toast.Provider>
  );
};

//
// Sections
//

const BUTTON_VARIANTS: ButtonVariant[] = ['default', 'primary', 'outline', 'ghost', 'destructive'];
const VALENCES: MessageValence[] = ['neutral', 'info', 'success', 'warning', 'error'];

const ButtonSection = () => (
  <Section id='button' title='Button'>
    {BUTTON_VARIANTS.map((variant) => (
      <Row key={variant} label={variant}>
        <Button variant={variant}>Button</Button>
        <Button variant={variant} icon='ph--paper-plane-tilt--regular'>
          With icon
        </Button>
        <Button variant={variant} disabled>
          Disabled
        </Button>
        <Button variant={variant} icon='ph--gear--regular' label='Settings' iconOnly />
        <Button variant={variant} iconEnd='ph--caret-down--regular' label='More' />
      </Row>
    ))}
    <Row label='valence'>
      {VALENCES.map((valence) => (
        <Button key={valence} variant='valence' valence={valence}>
          {valence}
        </Button>
      ))}
    </Row>
    <Row label='toggle'>
      <Toggle icon='ph--text-b--regular' label='Bold' iconOnly />
      <Toggle icon='ph--text-italic--regular' label='Italic' iconOnly defaultPressed />
      <Toggle icon='ph--text-underline--regular' label='Underline' iconOnly disabled />
      <Toggle icon='ph--star--regular' activeIcon='ph--star--fill' label='Pin' iconOnly />
      <ToggleGroup.Root type='single' defaultValue='left' aria-label='Alignment'>
        <ToggleGroup.Item value='left' icon='ph--text-align-left--regular' label='Left' iconOnly />
        <ToggleGroup.Item value='center' icon='ph--text-align-center--regular' label='Centre' iconOnly />
        <ToggleGroup.Item value='right' icon='ph--text-align-right--regular' label='Right' iconOnly />
      </ToggleGroup.Root>
      <ToggleGroup.Root type='multiple' defaultValue={['bold']} aria-label='Marks'>
        <ToggleGroup.Item value='bold'>Bold</ToggleGroup.Item>
        <ToggleGroup.Item value='italic'>Italic</ToggleGroup.Item>
        <ToggleGroup.Item value='code' disabled>
          Code
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </Row>
    <Row label='menu'>
      <MenuButtonDemo />
    </Row>
    <Row label='system'>
      <SystemButton.Add />
      <SystemButton.Edit />
      <SystemButton.Delete />
      <SystemButton.Star />
      <SystemButton.Bookmark />
      <SystemButton.Clipboard value='Copied from the playground' />
      <SystemButton.Ai />
      <SystemButton.Close />
      <SystemButton.Save iconOnly={false} />
      <SystemButton.Cancel iconOnly={false} />
    </Row>
  </Section>
);

const MenuButtonDemo = () => {
  const [view, setView] = useState('List');
  const [extraction, setExtraction] = useState(false);
  const items: MenuButtonItem[] = [
    { type: 'group', label: 'View' },
    ...['List', 'Grid', 'Board'].map((label): MenuButtonItem => ({
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
      <MenuButton icon='ph--sliders--regular' iconOnly caretDown label='Options' items={items} />
      <Typography tone='description'>
        {view} · extraction {extraction ? 'on' : 'off'}
      </Typography>
    </>
  );
};

const InputSection = () => (
  <Section id='input' title='Input'>
    <Field.Root>
      <Field.Label>Name</Field.Label>
      <Input placeholder='Ada Lovelace' />
      <Field.HelperText>Shown to other members.</Field.HelperText>
    </Field.Root>
    <Field.Root>
      <Field.Label>Search</Field.Label>
      <Input start={<Icon icon='ph--magnifying-glass--regular' />} placeholder='Find…' />
    </Field.Root>
    <Field.Root>
      <Field.Label>Workspace</Field.Label>
      <Input end='.dxos.org' placeholder='workspace' />
    </Field.Root>
    <Field.Root>
      <Field.Label>Subdued</Field.Label>
      <Input variant='subdued' placeholder='No well' />
    </Field.Root>
    <Field.Root readOnly>
      <Field.Label>Identity</Field.Label>
      <Input variant='mono' copyable defaultValue='did:key:z6Mk' />
    </Field.Root>
    <Field.Root disabled>
      <Field.Label>Disabled</Field.Label>
      <Input defaultValue='Locked' />
    </Field.Root>
    {(['success', 'info', 'warning', 'error'] as const).map((valence) => (
      <Field.Root key={valence} validationValence={valence}>
        <Field.Label>Handle ({valence})</Field.Label>
        <Input defaultValue='dxos' />
        <Field.HelperText>A {valence} message.</Field.HelperText>
      </Field.Root>
    ))}
    <Field.Root invalid>
      <Field.Label>Website</Field.Label>
      <Input defaultValue='not a url' />
      <Field.ErrorText>Enter a valid URL.</Field.ErrorText>
    </Field.Root>
    <Field.Root>
      <Field.Label>Notes</Field.Label>
      <Textarea autoResize placeholder='Grows as you type' />
    </Field.Root>
    <Field.Root>
      <Field.Label>Password</Field.Label>
      <PasswordInput defaultValue='hunter2' autoComplete='current-password' />
    </Field.Root>
    <Field.Root>
      <Field.Label>Quantity</Field.Label>
      <NumberInput min={0} max={10} defaultValue='8' />
    </Field.Root>
    <Field.Root>
      <Field.Label>Price</Field.Label>
      <NumberInput defaultValue='1250' step={0.5} formatOptions={{ style: 'currency', currency: 'USD' }} />
    </Field.Root>
    <Field.Root>
      <Field.Label>Code</Field.Label>
      <PinInput length={4} />
    </Field.Root>
    <Field.Root invalid>
      <Field.Label>Expired</Field.Label>
      <PinInput length={4} type='alphanumeric' defaultValue='AB12' />
      <Field.ErrorText>The code has expired.</Field.ErrorText>
    </Field.Root>
    <Field.Root>
      <Field.Label>Due</Field.Label>
      <DateInput defaultValue='2026-09-29' />
    </Field.Root>
    <Field.Root>
      <Field.Label>Starts at</Field.Label>
      <DateInput type='time' defaultValue='09:30' />
    </Field.Root>
    <Field.Root readOnly>
      <Field.Label>Meeting</Field.Label>
      <DateInput type='datetime-local' defaultValue='2026-09-29T14:00' />
    </Field.Root>
  </Section>
);

const CheckboxSection = () => (
  <Section id='checkbox' title='Checkbox, switch'>
    <Checkbox label='Subscribe' defaultChecked />
    <Checkbox label='Some selected' checked='indeterminate' />
    <Checkbox label='Disabled' disabled />
    <Switch label='Notifications' defaultChecked />
    <Switch label='Disabled' disabled />
  </Section>
);

const COLORS: SelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'black', label: 'Black', disabled: true },
];

const VIEWS: SelectOption[] = [
  { value: 'list', label: 'List', icon: 'ph--list--regular' },
  { value: 'grid', label: 'Grid', icon: 'ph--squares-four--regular' },
  { value: 'table', label: 'Table', icon: 'ph--table--regular' },
];

const PEOPLE: ComboboxOption[] = [
  { value: 'alice', label: 'Alice Green', icon: 'ph--user--regular' },
  { value: 'bob', label: 'Bob Grey', icon: 'ph--user--regular' },
  { value: 'carol', label: 'Carol Black', icon: 'ph--user--regular' },
  { value: 'dan', label: 'Dan Brown', icon: 'ph--user--regular', disabled: true },
];

const SelectSection = () => (
  <Section id='select' title='Select, combobox'>
    <Field.Root>
      <Select.Root items={COLORS}>
        <Select.Label>Color</Select.Label>
        <Select.Trigger placeholder='Pick a color' />
        <Select.Content>
          {COLORS.map((item) => (
            <Select.Item key={item.value} item={item} />
          ))}
        </Select.Content>
      </Select.Root>
    </Field.Root>
    <Field.Root>
      <Select.Root items={VIEWS} defaultValue={['grid']}>
        <Select.Label>View</Select.Label>
        <Select.Trigger />
        <Select.Content>
          {VIEWS.map((item) => (
            <Select.Item key={item.value} item={item} />
          ))}
        </Select.Content>
      </Select.Root>
    </Field.Root>
    <Field.Root>
      <Select.Root items={COLORS} multiple>
        <Select.Label>Colors</Select.Label>
        <Select.Trigger placeholder='Several' />
        <Select.Content>
          {COLORS.map((item) => (
            <Select.Item key={item.value} item={item} />
          ))}
        </Select.Content>
      </Select.Root>
    </Field.Root>
    <Field.Root>
      <Combobox.Root items={PEOPLE}>
        <Combobox.Label>Owner</Combobox.Label>
        <Combobox.Control>
          <Combobox.Input placeholder='Search people' />
          <Combobox.ClearTrigger aria-label='Clear owner' />
          <Combobox.Trigger />
        </Combobox.Control>
        <Combobox.Content />
      </Combobox.Root>
    </Field.Root>
    <Field.Root>
      <Combobox.Root items={PEOPLE}>
        <Combobox.Label>Reviewer</Combobox.Label>
        <Combobox.Trigger placeholder='Pick a person' />
        <Combobox.Content />
      </Combobox.Root>
    </Field.Root>
  </Section>
);

const SliderSection = () => {
  const [value, setValue] = useState([40]);
  return (
    <Section id='slider' title='Slider'>
      <Slider value={value} onValueChange={setValue} max={100} label='Volume' />
      <Slider defaultValue={[25, 75]} max={100} thumbLabels={['Minimum', 'Maximum']} label='Price' />
      <Slider defaultValue={[50]} max={100} disabled aria-label='Disabled value' />
    </Section>
  );
};

const STEPS = ['Plan', 'Build', 'Verify', 'Ship'].map((label) => ({ id: label, label }));

const ProgressSection = () => (
  <Section id='progress' title='Progress, steps'>
    <Progress value={0.35} label='Upload' />
    <Progress indeterminate label='Indexing' />
    <Progress indeterminate error label='Failed' />
    <Steps steps={STEPS} active={1} fraction={0.5} />
  </Section>
);

const TagSection = () => (
  <Section id='tag' title='Tag'>
    <Group>
      {[...VALENCES, ...hues].map((hue) => (
        <Tag key={hue} hue={hue}>
          {hue}
        </Tag>
      ))}
    </Group>
  </Section>
);

const AvatarSection = () => (
  <Section id='avatar' title='Avatar'>
    <Group>
      <Avatar.Root fallback='Ada Lovelace' hue='blue' status='current' label='Ada Lovelace' />
      <Avatar.Root fallback='🦊' hue='amber' label='Fox' />
      <Avatar.Root fallback='Bob' hue='rose' variant='square' status='inactive' label='Bob' />
      <Avatar.Root icon='ph--robot--regular' hue='violet' hueVariant='surface' label='Agent' />
      <Avatar.Root fallback='Eve' hue='teal' hueVariant='transparent' status='error' label='Eve' />
    </Group>
  </Section>
);

const SkeletonSection = () => (
  <Section id='skeleton' title='Skeleton'>
    <div className='flex gap-2'>
      <Skeleton variant='circle' />
      <div className='flex flex-col grow'>
        <Skeleton variant='text' classNames='w-2/3' />
        <Skeleton variant='text' classNames='w-1/3' />
      </div>
    </div>
    <Skeleton />
  </Section>
);

const TRAIL = ['Home', 'Projects', 'Composer'];

const NavigationSection = () => (
  <Section id='navigation' title='Breadcrumb, link, separator'>
    <Breadcrumb.Root aria-label='Location'>
      <Breadcrumb.List>
        {TRAIL.map((step) => (
          <Fragment key={step}>
            <Breadcrumb.Item>
              <Breadcrumb.Link href='#'>{step}</Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />
          </Fragment>
        ))}
        <Breadcrumb.Item>
          <Breadcrumb.Current>Design review</Breadcrumb.Current>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
    <Typography>
      Read the <Link href='https://dxos.org'>guide</Link>, or the{' '}
      <Link href='https://github.com/dxos/dxos/releases' variant='neutral'>
        release notes
      </Link>
      .
    </Typography>
    <Separator />
    <Group>
      <Button>Left</Button>
      <Separator orientation='vertical' />
      <Button>Middle</Button>
      <Separator orientation='vertical' decorative />
      <Button>Right</Button>
    </Group>
  </Section>
);

const TabsSection = () => (
  <Section id='tabs' title='Tabs'>
    <Tabs.Root defaultValue='overview' classNames='h-40'>
      <Tabs.List aria-label='Project'>
        <Tabs.Trigger value='overview' label='Overview' />
        <Tabs.Trigger value='tasks' icon='ph--check-square--regular' label='Tasks' />
        <Tabs.Trigger value='settings' icon='ph--gear--regular' label='Settings' iconOnly />
      </Tabs.List>
      <Tabs.Content value='overview'>
        <Typography>A summary of the project.</Typography>
      </Tabs.Content>
      <Tabs.Content value='tasks'>
        <Typography>Three open tasks.</Typography>
      </Tabs.Content>
      <Tabs.Content value='settings'>
        <Input aria-label='Name' defaultValue='Apollo' />
      </Tabs.Content>
    </Tabs.Root>
  </Section>
);

const ToolbarSection = () => (
  <Section id='toolbar' title='Toolbar'>
    <Toolbar.Root>
      <Button icon='ph--arrow-counter-clockwise--regular' label='Undo' iconOnly />
      <Button icon='ph--arrow-clockwise--regular' label='Redo' iconOnly />
      <Toolbar.Separator />
      <Toolbar.ToggleGroup type='multiple' aria-label='Marks'>
        <ToggleGroup.Item value='bold' icon='ph--text-b--regular' label='Bold' iconOnly />
        <ToggleGroup.Item value='italic' icon='ph--text-italic--regular' label='Italic' iconOnly />
        <ToggleGroup.Item value='underline' icon='ph--text-underline--regular' label='Underline' iconOnly />
      </Toolbar.ToggleGroup>
      <Toolbar.Separator />
      <Input placeholder='Search' aria-label='Search' />
      <Toolbar.Separator variant='gap' />
      <Button variant='primary'>Publish</Button>
    </Toolbar.Root>
    <Toolbar.Root>
      <DragHandle label='Drag' />
      <Toolbar.Text>A document title long enough to be truncated by the toolbar</Toolbar.Text>
      <Toolbar.Link href='https://dxos.org'>Docs</Toolbar.Link>
      <Button>Share</Button>
    </Toolbar.Root>
  </Section>
);

const EditableSection = () => {
  const [value, setValue] = useState('Ship the spring release');
  return (
    <Section id='editable' title='Editable'>
      <Editable.Root value={value} onValueChange={setValue} placeholder='Untitled'>
        <Editable.Preview aria-label='Title' />
        <Editable.Input />
      </Editable.Root>
    </Section>
  );
};

const ACCORDION_ITEMS = [
  { value: 'search', icon: 'ph--magnifying-glass--regular', label: 'Search the web', detail: '12 results for "zag"' },
  { value: 'read', icon: 'ph--file-text--regular', label: 'Read a document', detail: 'Read DESIGN.md (673 lines)' },
];

const CollapsibleSection = () => (
  <Section id='collapsible' title='Collapsible, accordion'>
    <Collapsible.Root>
      <Collapsible.Trigger>Advanced settings</Collapsible.Trigger>
      <Collapsible.Content>
        <Typography>These settings change how your space syncs.</Typography>
        <Switch label='Sync over cellular' />
      </Collapsible.Content>
    </Collapsible.Root>
    <Accordion.Root border multiple>
      {ACCORDION_ITEMS.map(({ value, icon, label, detail }) => (
        <Accordion.Item key={value} value={value}>
          <Accordion.ItemTrigger icon={icon}>{label}</Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Typography>{detail}</Typography>
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  </Section>
);

const CardSection = () => (
  <Section id='card' title='Card'>
    <div className='grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] items-start gap-4'>
      <Card.Root>
        <Card.Header>
          <Card.Title>Roadmap</Card.Title>
          <Button icon='ph--dots-three--regular' label='More actions' iconOnly />
        </Card.Header>
        <Card.Body>
          <Card.Description>What ships next quarter and why.</Card.Description>
          <Typography>Three milestones, each with an owner and a date.</Typography>
        </Card.Body>
        <Card.Footer>
          <Button>Dismiss</Button>
          <Button variant='primary'>Review</Button>
        </Card.Footer>
      </Card.Root>
      <Card.Root grid>
        <Card.Header>
          <Card.Title>Project</Card.Title>
          <Card.Action system='close' />
        </Card.Header>
        <Card.Section title='Members'>
          <Card.Row icon='ph--user--regular' trailing={<Tag hue='emerald'>Owner</Tag>}>
            Ada Lovelace
          </Card.Row>
          <Card.Row icon='ph--user--regular' trailing={<Card.Action icon='ph--x--regular' label='Remove' />}>
            Charles Babbage
          </Card.Row>
        </Card.Section>
        <Card.Section>
          <Card.Text variant='description'>Updated today.</Card.Text>
        </Card.Section>
      </Card.Root>
    </div>
  </Section>
);

const BannerSection = () => (
  <Section id='banner' title='Banner'>
    <Container gap='md'>
      {VALENCES.map((valence) => (
        <Banner.Root key={valence} valence={valence}>
          <Banner.Title>{valence}</Banner.Title>
          <Banner.Body>A banner with the {valence} valence.</Banner.Body>
        </Banner.Root>
      ))}
    </Container>
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
  <Section id='carousel' title='Carousel'>
    <Carousel.Root count={SLIDES.length} continuous>
      <Carousel.PrevTrigger />
      <Carousel.ItemGroup>
        {SLIDES.map((src, index) => (
          <Carousel.Item key={src} index={index} src={src} alt={`Slide ${index + 1}`} />
        ))}
      </Carousel.ItemGroup>
      <Carousel.NextTrigger />
      <Carousel.IndicatorGroup />
      <Carousel.Caption>{(page) => `Slide ${page + 1} of ${SLIDES.length}`}</Carousel.Caption>
    </Carousel.Root>
  </Section>
);

const SplitterSection = () => {
  const [size, setSize] = useState(12);
  return (
    <Section id='splitter' title='Splitter'>
      <div className='flex flex-col h-40 border border-separator'>
        <Splitter.Root orientation='horizontal' resizable minSize={6} size={size} onSizeChange={setSize}>
          <Splitter.Panel position='start'>
            <Typography tone='description' classNames='p-2'>
              Drag the seam.
            </Typography>
          </Splitter.Panel>
          <Splitter.ResizeTrigger aria-label='Resize' />
          <Splitter.Panel position='end'>
            <Typography tone='description' classNames='p-2'>
              {size.toFixed(1)}rem
            </Typography>
          </Splitter.Panel>
        </Splitter.Root>
      </div>
    </Section>
  );
};

const SCROLL_ROWS = Array.from({ length: 24 }, (_, index) => `Row ${index + 1}`);
const SCROLL_TAGS = Array.from({ length: 16 }, (_, index) => `Tag ${index + 1}`);

const ScrollAreaSection = () => (
  <Section id='scroll-area' title='Scroll area'>
    <div className='flex flex-col h-40 border border-separator'>
      <ScrollArea.Root classNames='flex-1'>
        <ScrollArea.Viewport asChild>
          <Container gutter='rail'>
            {SCROLL_ROWS.map((row) => (
              <Typography key={row}>{row}</Typography>
            ))}
          </Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
    <ScrollArea.Root orientation='horizontal' snap autoHide>
      <ScrollArea.Viewport>
        <div className='flex w-max gap-2 py-2'>
          {SCROLL_TAGS.map((tag) => (
            <Tag key={tag} hue='sky' classNames='snap-start'>
              {tag}
            </Tag>
          ))}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  </Section>
);

const QrCodeSection = () => (
  <Section id='qr-code' title='QR code'>
    <div className='grid grid-cols-[repeat(2,8rem)] gap-8 text-description'>
      <QrCode value='https://dxos.org' icon='ph--planet--regular' label='DXOS' />
      <QrCode value='https://composer.space' errorCorrection='H' label='Composer' />
    </div>
  </Section>
);

const MINUTES = [0, 1, 42, 5 * 60, 26 * 60, 40 * 24 * 60];

const TimestampSection = () => {
  const [now] = useState(() => new Date());
  return (
    <Section id='timestamp' title='Timestamp'>
      <Group>
        {MINUTES.map((minutes) => (
          <Timestamp key={minutes} date={new Date(now.getTime() - minutes * 60_000)} />
        ))}
      </Group>
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
      <Group>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button>Tooltip</Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Save changes (⌘S)</Tooltip.Content>
        </Tooltip.Root>
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button>Popover</Button>
          </Popover.Trigger>
          <Popover.Content>
            <Popover.Header>
              <Popover.Title>Share space</Popover.Title>
              <Popover.CloseTrigger />
            </Popover.Header>
            <Popover.Description>Anyone with the link can view.</Popover.Description>
            <Field.Root>
              <Field.Label>Link</Field.Label>
              <Input defaultValue='https://composer.space/s/123' readOnly />
            </Field.Root>
          </Popover.Content>
        </Popover.Root>
        <HoverCard.Root>
          <HoverCard.Trigger asChild>
            <Button>Hover card</Button>
          </HoverCard.Trigger>
          <HoverCard.Content>
            <Typography>Alice Example</Typography>
            <Typography tone='description'>Joined in March · 12 spaces</Typography>
          </HoverCard.Content>
        </HoverCard.Root>
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button>Menu</Button>
          </Menu.Trigger>
          <Menu.Content>
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>Edit</Menu.ItemGroupLabel>
              {MENU_ITEMS.map((item) => (
                <Menu.Item key={item.value} item={item} />
              ))}
            </Menu.ItemGroup>
            <Menu.Separator />
            <Menu.CheckboxItem item={{ value: 'grid', label: 'Show grid' }} checked={grid} onCheckedChange={setGrid} />
            <Menu.Sub>
              <Menu.TriggerItem item={{ label: 'Share', icon: 'ph--share--regular' }} />
              <Menu.Content>
                <Menu.Item item={{ value: 'email', label: 'Email' }} />
                <Menu.Item item={{ value: 'link', label: 'Copy link' }} />
              </Menu.Content>
            </Menu.Sub>
          </Menu.Content>
        </Menu.Root>
        <Menu.Root>
          <Menu.ContextTrigger asChild>
            <Typography tone='description' classNames='px-3 border border-dashed border-separator rounded-sm'>
              Right-click here
            </Typography>
          </Menu.ContextTrigger>
          <Menu.Content>
            <Menu.Item item={{ value: 'rename', label: 'Rename' }} />
          </Menu.Content>
        </Menu.Root>
      </Group>
    </Section>
  );
};

const DialogsSection = () => {
  const [toast, setToast] = useState(false);
  return (
    <Section id='dialogs' title='Dialog, alert dialog, toast'>
      <Group>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button>Dialog</Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Edit profile</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              <Dialog.Description>Update how others see you.</Dialog.Description>
              <Field.Root>
                <Field.Label>Name</Field.Label>
                <Input placeholder='Ada Lovelace' />
              </Field.Root>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <SystemButton.Cancel iconOnly={false} />
              </Dialog.CloseTrigger>
              <SystemButton.Save iconOnly={false} />
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <Button variant='destructive'>Delete space</Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Delete space?</AlertDialog.Title>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <AlertDialog.Description>Its objects are removed for every member.</AlertDialog.Description>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action variant='destructive'>Delete</AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
        <Button onClick={() => setToast(true)}>Toast</Button>
      </Group>
      <Toast.Root open={toast} duration={6_000} onOpenChange={setToast}>
        <Toast.Header icon='ph--sparkle--regular'>Saved</Toast.Header>
        <Toast.Description>The bar counts down to when this closes.</Toast.Description>
        <Toast.Footer>
          <Toast.ActionTrigger onClick={() => setToast(false)}>Undo</Toast.ActionTrigger>
        </Toast.Footer>
      </Toast.Root>
    </Section>
  );
};

const EmptySection = () => (
  <Section id='empty' title='Empty'>
    <Empty />
    <Empty icon='ph--tray--regular'>No documents yet</Empty>
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

type PlaygroundArgs = { hue: AccentHue; size: Size };

const meta = {
  title: 'ui/react-ui-core/playground/Playground',
  decorators: [withTheme()],
  parameters: { layout: 'fullscreen', translations },
  args: { hue: 'blue', size: 'md' },
  argTypes: {
    hue: { control: 'select', options: ACCENT_HUES },
    size: { control: 'select', options: SIZES },
  },
} satisfies Meta<PlaygroundArgs>;

export default meta;

type Story = StoryObj<PlaygroundArgs>;

export const All: Story = {
  render: ({ hue, size }) => <Frame sections={SECTIONS} hue={hue} size={size} />,
};
