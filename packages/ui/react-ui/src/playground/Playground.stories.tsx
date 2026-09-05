//
// Copyright 2026 DXOS.org
//

// One section per component family, each its own story, and `All` composing every section into a
// single page. The frame's controls set the accent hue and density for whatever is inside it.

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type CSSProperties, type PropsWithChildren, useState } from 'react';

import { mx } from '@dxos/ui-theme';
import { type Density, type MessageValence } from '@dxos/ui-types';

import {
  AlertDialog,
  Avatar,
  Banner,
  Breadcrumb,
  Button,
  type ButtonProps,
  Card,
  Collapsible,
  ContextMenu,
  Dialog,
  DropdownMenu,
  Editable,
  Icon,
  IconButton,
  Input,
  type InputVariant,
  Link,
  Popover,
  Progress,
  Select,
  Separator,
  Skeleton,
  Slider,
  Stepper,
  Tag,
  Toast,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  Tooltip,
} from '../components';
import { DensityProvider } from '../providers';
import { withTheme } from '../testing';

//
// Frame
//

/** Tailwind hues the accent can take; the roles derive every accent token from one hue. */
const ACCENT_HUES = ['blue', 'indigo', 'violet', 'purple', 'pink', 'red', 'orange', 'amber', 'green', 'teal', 'cyan'];

/** Overrides the accent role tokens for a subtree, the way `roles.css` derives them from blue. */
const accentStyle = (hue: string): CSSProperties =>
  ({
    '--color-accent-bg': `light-dark(var(--color-${hue}-600), var(--color-${hue}-700))`,
    '--color-accent-bg-hover': `light-dark(var(--color-${hue}-700), var(--color-${hue}-800))`,
    '--color-accent-fg': `var(--color-${hue}-100)`,
    '--color-accent-text': `light-dark(var(--color-${hue}-600), var(--color-${hue}-400))`,
    '--color-accent-text-hover': `var(--color-${hue}-500)`,
  }) as CSSProperties;

const DENSITIES: Density[] = ['sm', 'md', 'lg'];

const HueSelect = ({ value, onValueChange }: { value: string; onValueChange: (hue: string) => void }) => (
  <Select.Root value={value} onValueChange={onValueChange}>
    <Select.TriggerButton placeholder='Accent' />
    <Select.Portal>
      <Select.Content>
        <Select.Viewport>
          {ACCENT_HUES.map((option) => (
            <Select.Option key={option} value={option}>
              <span className='flex items-center gap-2'>
                <span className='size-3 rounded-full' style={{ background: `var(--color-${option}-600)` }} />
                {option}
              </span>
            </Select.Option>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

/** The page: a sticky control bar, then the sections under the chosen accent and density. */
const Frame = ({ children }: PropsWithChildren) => {
  const [hue, setHue] = useState('blue');
  const [density, setDensity] = useState<Density>('md');
  return (
    <Tooltip.Provider>
      <Toast.Provider>
        <div className='flex flex-col min-h-dvh' style={accentStyle(hue)}>
          <Toolbar.Root classNames='sticky top-0 z-10 dx-base-surface border-b border-separator px-4'>
            <span className='text-sm text-description'>Accent</span>
            <HueSelect value={hue} onValueChange={setHue} />
            <span className='text-sm text-description'>Density</span>
            <Toolbar.ToggleGroup
              type='single'
              value={density}
              onValueChange={(next) => next && setDensity(next as Density)}
            >
              {DENSITIES.map((option) => (
                <Toolbar.ToggleGroupItem key={option} value={option}>
                  {option}
                </Toolbar.ToggleGroupItem>
              ))}
            </Toolbar.ToggleGroup>
          </Toolbar.Root>
          <DensityProvider density={density}>
            <div className='flex flex-col gap-8 p-4'>{children}</div>
          </DensityProvider>
        </div>
        <Toast.Viewport />
      </Toast.Provider>
    </Tooltip.Provider>
  );
};

const Section = ({ title, fields = false, children }: PropsWithChildren<{ title: string; fields?: boolean }>) => (
  <section className='flex flex-col gap-3'>
    <h2 className='text-sm font-medium text-description'>{title}</h2>
    {/* `Input.Root` renders no element, so a row of fields has the fields as its own children. */}
    <div className={mx('flex flex-wrap items-center gap-3', fields && '[&>*]:w-64')}>{children}</div>
  </section>
);

const Row = ({ label, children }: PropsWithChildren<{ label?: string }>) => (
  <div className='flex flex-wrap items-center gap-3 basis-full'>
    {label && <span className='w-24 text-xs text-description'>{label}</span>}
    {children}
  </div>
);

//
// Sections
//

const BUTTON_VARIANTS: NonNullable<ButtonProps['variant']>[] = [
  'default',
  'primary',
  'outline',
  'ghost',
  'destructive',
];

const ButtonsSection = () => (
  <Section title='Button'>
    {BUTTON_VARIANTS.map((variant) => (
      <Row key={variant} label={variant}>
        <Button variant={variant}>Button</Button>
        <Button variant={variant}>
          <Icon icon='ph--paper-plane-tilt--regular' />
          With icon
        </Button>
        <Button variant={variant} disabled>
          Disabled
        </Button>
        <IconButton variant={variant} icon='ph--gear--regular' iconOnly label='Settings' />
        <IconButton variant={variant} icon='ph--plus--regular' label='Add' />
      </Row>
    ))}
    <Row label='toggle'>
      <Toggle>
        <Icon icon='ph--text-b--regular' />
      </Toggle>
      <Toggle defaultPressed>
        <Icon icon='ph--text-italic--regular' />
      </Toggle>
      <ToggleGroup type='multiple' defaultValue={['a']}>
        <ToggleGroupItem value='a'>
          <Icon icon='ph--text-align-left--regular' />
        </ToggleGroupItem>
        <ToggleGroupItem value='b'>
          <Icon icon='ph--text-align-center--regular' />
        </ToggleGroupItem>
        <ToggleGroupItem value='c'>
          <Icon icon='ph--text-align-right--regular' />
        </ToggleGroupItem>
      </ToggleGroup>
    </Row>
  </Section>
);

const VARIANTS: InputVariant[] = ['default', 'subdued'];

const TextFieldsSection = () => {
  const [value, setValue] = useState('');
  return (
    <Section title='Text field' fields>
      {VARIANTS.map((variant) => (
        <Input.Root key={variant}>
          <Input.TextInput variant={variant} placeholder={variant} />
        </Input.Root>
      ))}
      <Input.Root>
        <Input.TextInput placeholder='Search' start={<Icon icon='ph--magnifying-glass--regular' />} />
      </Input.Root>
      <Input.Root>
        <Input.TextInput
          placeholder='Type to clear'
          value={value}
          onChange={(event) => setValue(event.target.value)}
          end={
            value ? (
              <IconButton variant='ghost' icon='ph--x--regular' iconOnly label='Clear' onClick={() => setValue('')} />
            ) : undefined
          }
        />
      </Input.Root>
      <Input.Root>
        <Input.TextInput
          placeholder='Command'
          start={<Icon icon='ph--terminal--regular' />}
          end={<kbd className='text-xs text-description'>⌘K</kbd>}
        />
      </Input.Root>
      <Input.Root>
        <Input.TextInput
          placeholder='With action'
          end={
            <Button density='sm' variant='primary'>
              Go
            </Button>
          }
        />
      </Input.Root>
      <Input.Root>
        <Input.TextInput placeholder='Disabled' disabled />
      </Input.Root>
      <Input.Root>
        <Input.TextInput readOnly defaultValue='Read only' />
      </Input.Root>
      <Input.Root validationValence='error'>
        <Input.TextInput defaultValue='Not an email' />
      </Input.Root>
      <Input.Root validationValence='warning'>
        <Input.TextInput defaultValue='Weak' />
      </Input.Root>
      <Input.Root validationValence='success'>
        <Input.TextInput defaultValue='Available' />
      </Input.Root>
      <Input.Root>
        <Input.TextArea placeholder='Text area' rows={3} classNames='resize-none' />
      </Input.Root>
    </Section>
  );
};

const ControlsSection = () => (
  <Section title='Checkbox, switch, PIN'>
    <Input.Root>
      <Input.Checkbox defaultChecked />
      <Input.Label>Checked</Input.Label>
    </Input.Root>
    <Input.Root>
      <Input.Checkbox />
      <Input.Label>Unchecked</Input.Label>
    </Input.Root>
    <Input.Root>
      <Input.Checkbox defaultChecked disabled />
      <Input.Label>Disabled</Input.Label>
    </Input.Root>
    <Input.Root>
      <Input.Switch defaultChecked />
      <Input.Label>Switch</Input.Label>
    </Input.Root>
    <Input.Root>
      <Input.Switch disabled />
      <Input.Label>Disabled</Input.Label>
    </Input.Root>
    <Input.Root>
      <Input.PinInput length={4} />
    </Input.Root>
  </Section>
);

const SelectSection = () => {
  const [value, setValue] = useState('apple');
  return (
    <Section title='Select'>
      <Select.Root value={value} onValueChange={setValue}>
        <Select.TriggerButton placeholder='Fruit' />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              <Select.Option value='apple'>Apple</Select.Option>
              <Select.Option value='orange'>Orange</Select.Option>
              <Select.Option value='grape' disabled>
                Grape
              </Select.Option>
              <Select.Option value='pear'>Pear</Select.Option>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <Select.Root disabled defaultValue='none'>
        <Select.TriggerButton placeholder='Disabled' />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              <Select.Option value='none'>Disabled</Select.Option>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Section>
  );
};

const SliderSection = () => {
  const [value, setValue] = useState([40]);
  return (
    <Section title='Slider'>
      <div className='w-64'>
        <Slider value={value} onValueChange={setValue} max={100} step={1} aria-label='Value' />
      </div>
      <div className='w-64'>
        <Slider defaultValue={[25, 75]} max={100} step={1} thumbLabels={['Minimum', 'Maximum']} />
      </div>
      <div className='w-64'>
        <Slider defaultValue={[50]} max={100} step={1} disabled aria-label='Disabled' />
      </div>
    </Section>
  );
};

const ProgressSection = () => (
  <Section title='Progress'>
    <div className='w-64'>
      <Progress progress={0.35} />
    </div>
    <div className='w-64'>
      <Progress indeterminate />
    </div>
    <div className='w-64'>
      <Stepper
        steps={['Plan', 'Build', 'Verify', 'Ship'].map((label) => ({ id: label.toLowerCase(), label }))}
        active={1}
        fraction={0.5}
      />
    </div>
  </Section>
);

const HUES = [
  'neutral',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const;

const TagsSection = () => (
  <Section title='Tag'>
    {HUES.map((hue) => (
      <Tag key={hue} hue={hue}>
        {hue}
      </Tag>
    ))}
  </Section>
);

const AvatarSection = () => (
  <Section title='Avatar'>
    {(['circle', 'square'] as const).map((variant) => (
      <Avatar.Root key={variant}>
        <Avatar.Content size={10} variant={variant} status='active' hue='teal' fallback='🦋' />
        <div>
          <Avatar.Label classNames='block'>Alice</Avatar.Label>
          <Avatar.Description classNames='block'>{variant}</Avatar.Description>
        </div>
      </Avatar.Root>
    ))}
    <Avatar.Root>
      <Avatar.Content size={10} status='inactive' hue='rose' fallback='B' />
      <div>
        <Avatar.Label classNames='block'>Bob</Avatar.Label>
        <Avatar.Description classNames='block'>inactive</Avatar.Description>
      </div>
    </Avatar.Root>
  </Section>
);

const SkeletonSection = () => (
  <Section title='Skeleton'>
    <div className='flex items-center gap-3 w-64'>
      <Skeleton variant='circle' classNames='size-10 shrink-0 rounded-full' />
      <div className='flex flex-col gap-2 grow'>
        <Skeleton classNames='h-3 w-full' />
        <Skeleton classNames='h-3 w-4/6' />
      </div>
    </div>
  </Section>
);

const NavigationSection = () => (
  <Section title='Breadcrumb, link, separator'>
    <Breadcrumb.Root aria-label='Location'>
      <Breadcrumb.List>
        <Breadcrumb.ListItem>
          <Breadcrumb.Link href='#'>Home</Breadcrumb.Link>
          <Breadcrumb.Separator />
        </Breadcrumb.ListItem>
        <Breadcrumb.ListItem>
          <Breadcrumb.Link href='#'>Mailbox</Breadcrumb.Link>
          <Breadcrumb.Separator />
        </Breadcrumb.ListItem>
        <Breadcrumb.ListItem>
          <Breadcrumb.Current>All</Breadcrumb.Current>
        </Breadcrumb.ListItem>
      </Breadcrumb.List>
    </Breadcrumb.Root>
    <Separator orientation='vertical' classNames='h-6' />
    <Link href='#'>A link</Link>
    <Separator orientation='vertical' classNames='h-6' />
    <div className='w-40'>
      <Separator />
    </div>
  </Section>
);

const EditableSection = () => {
  const [value, setValue] = useState('Ship the spring release');
  return (
    <Section title='Editable'>
      <Editable.Root value={value} onValueChange={setValue} placeholder='Untitled'>
        <Editable.Preview aria-label='Title' />
        <Editable.Input />
      </Editable.Root>
    </Section>
  );
};

const CollapsibleSection = () => (
  <Section title='Collapsible'>
    <Collapsible.Root defaultOpen classNames='w-64 border border-separator rounded-sm p-2'>
      <Collapsible.Trigger>Details</Collapsible.Trigger>
      <Collapsible.Content>
        <p className='pt-2 text-description'>Folds under its own heading.</p>
      </Collapsible.Content>
    </Collapsible.Root>
  </Section>
);

const CardSection = () => (
  <Section title='Card'>
    <Card.Root>
      <Card.Header>
        <Card.Title>Card title</Card.Title>
        <Card.ActionIconButton action='close' />
      </Card.Header>
      <Card.Body>
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--dot-outline--regular' />
          </Card.Block>
          <Card.Text>Card text</Card.Text>
        </Card.Row>
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--dot-outline--regular' />
          </Card.Block>
          <Card.Text variant='description'>A description line.</Card.Text>
        </Card.Row>
        <Card.Action label='Action' />
      </Card.Body>
    </Card.Root>
  </Section>
);

const VALENCES: MessageValence[] = ['neutral', 'info', 'success', 'warning', 'error'];

const BannerSection = () => (
  <Section title='Banner'>
    {VALENCES.map((valence) => (
      <div key={valence} className='w-80'>
        <Banner.Root valence={valence}>
          <Banner.Content>
            <Banner.Title>{valence}</Banner.Title>
            <Banner.Body>A banner with the {valence} valence.</Banner.Body>
          </Banner.Content>
        </Banner.Root>
      </div>
    ))}
  </Section>
);

const OverlaysSection = () => (
  <Section title='Tooltip, popover, menus'>
    <Tooltip.Trigger asChild content='A tooltip'>
      <Button>Hover me</Button>
    </Tooltip.Trigger>
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button>Popover</Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Popover.Viewport>
            <p className='px-2 py-1'>Popover body.</p>
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button>Menu</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <DropdownMenu.Item>New</DropdownMenu.Item>
            <DropdownMenu.Item>Open</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.CheckboxItem checked>Checked</DropdownMenu.CheckboxItem>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className='flex items-center justify-center w-40 h-12 border border-dashed border-separator rounded-sm text-description'>
          Right click
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Viewport>
          <ContextMenu.Item>Cut</ContextMenu.Item>
          <ContextMenu.Item>Copy</ContextMenu.Item>
          <ContextMenu.Item>Paste</ContextMenu.Item>
        </ContextMenu.Viewport>
        <ContextMenu.Arrow />
      </ContextMenu.Content>
    </ContextMenu.Root>
  </Section>
);

const DialogsSection = () => {
  const [toasts, setToasts] = useState<number[]>([]);
  const addToast = () => setToasts((current) => [...current, (current.at(-1) ?? 0) + 1]);
  const removeToast = (id: number) => setToasts((current) => current.filter((toast) => toast !== id));
  return (
    <Section title='Dialog, alert dialog, toast'>
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <Button>Dialog</Button>
        </Dialog.Trigger>
        <Dialog.Overlay>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Dialog</Dialog.Title>
              <Dialog.Close asChild>
                <Dialog.ActionIconButton action='close' />
              </Dialog.Close>
            </Dialog.Header>
            <Dialog.Body>
              <Dialog.Description>A modal dialog.</Dialog.Description>
            </Dialog.Body>
            <Dialog.ActionBar>
              <Dialog.Close asChild>
                <Button>Cancel</Button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Button variant='primary'>Save</Button>
              </Dialog.Close>
            </Dialog.ActionBar>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Root>
      <AlertDialog.Root>
        <AlertDialog.Trigger asChild>
          <Button variant='destructive'>Delete</Button>
        </AlertDialog.Trigger>
        <AlertDialog.Overlay>
          <AlertDialog.Content>
            <AlertDialog.Body>
              <AlertDialog.Title>Delete this?</AlertDialog.Title>
              <AlertDialog.Description>It cannot be recovered.</AlertDialog.Description>
            </AlertDialog.Body>
            <AlertDialog.ActionBar>
              <AlertDialog.Cancel asChild>
                <Button>Cancel</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant='destructive'>Delete</Button>
              </AlertDialog.Action>
            </AlertDialog.ActionBar>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Root>
      <Button onClick={addToast}>Toast</Button>
      {/* One root per toast: each click adds one and open ones stack. */}
      {toasts.map((id) => (
        <Toast.Root key={id} duration={6_000} onOpenChange={(open) => !open && removeToast(id)}>
          <Toast.Title icon='ph--sparkle--regular' onClose={() => removeToast(id)}>
            Saved {id}
          </Toast.Title>
          <Toast.Description>The bar below counts down to when this closes.</Toast.Description>
          <Toast.Actions>
            <Toast.Action asChild>
              <Button variant='primary'>Undo</Button>
            </Toast.Action>
          </Toast.Actions>
        </Toast.Root>
      ))}
    </Section>
  );
};

//
// Stories
//

const SECTIONS = [
  ButtonsSection,
  TextFieldsSection,
  ControlsSection,
  SelectSection,
  SliderSection,
  ProgressSection,
  TagsSection,
  AvatarSection,
  SkeletonSection,
  NavigationSection,
  EditableSection,
  CollapsibleSection,
  CardSection,
  BannerSection,
  OverlaysSection,
  DialogsSection,
];

const meta = {
  title: 'ui/react-ui-core/playground/Playground',
  decorators: [withTheme()],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// Object literals throughout: Storybook's indexer reads exports statically and skips a factory call.

export const All: Story = {
  render: () => (
    <Frame>
      {SECTIONS.map((Component) => (
        <Component key={Component.name} />
      ))}
    </Frame>
  ),
};

export const Buttons: Story = {
  render: () => (
    <Frame>
      <ButtonsSection />
    </Frame>
  ),
};
export const TextFields: Story = {
  render: () => (
    <Frame>
      <TextFieldsSection />
    </Frame>
  ),
};
export const Controls: Story = {
  render: () => (
    <Frame>
      <ControlsSection />
    </Frame>
  ),
};
export const SelectField: Story = {
  render: () => (
    <Frame>
      <SelectSection />
    </Frame>
  ),
};
export const SliderField: Story = {
  render: () => (
    <Frame>
      <SliderSection />
    </Frame>
  ),
};
export const ProgressBars: Story = {
  render: () => (
    <Frame>
      <ProgressSection />
    </Frame>
  ),
};
export const Tags: Story = {
  render: () => (
    <Frame>
      <TagsSection />
    </Frame>
  ),
};
export const Avatars: Story = {
  render: () => (
    <Frame>
      <AvatarSection />
    </Frame>
  ),
};
export const Skeletons: Story = {
  render: () => (
    <Frame>
      <SkeletonSection />
    </Frame>
  ),
};
export const Navigation: Story = {
  render: () => (
    <Frame>
      <NavigationSection />
    </Frame>
  ),
};
export const EditableText: Story = {
  render: () => (
    <Frame>
      <EditableSection />
    </Frame>
  ),
};
export const Collapsibles: Story = {
  render: () => (
    <Frame>
      <CollapsibleSection />
    </Frame>
  ),
};
export const Cards: Story = {
  render: () => (
    <Frame>
      <CardSection />
    </Frame>
  ),
};
export const Banners: Story = {
  render: () => (
    <Frame>
      <BannerSection />
    </Frame>
  ),
};
export const Overlays: Story = {
  render: () => (
    <Frame>
      <OverlaysSection />
    </Frame>
  ),
};
export const Dialogs: Story = {
  render: () => (
    <Frame>
      <DialogsSection />
    </Frame>
  ),
};
