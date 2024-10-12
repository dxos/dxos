//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { DatePicker } from './DatePicker';
import { withTheme } from '../../testing';

const StorybookDatePicker = () => {
  // return (
  //   <DatePicker.Root>
  //     <DatePicker.Label>Label</DatePicker.Label>
  //     <DatePicker.Control>
  //       <DatePicker.Input />
  //       <DatePicker.Trigger>📅</DatePicker.Trigger>
  //       <DatePicker.ClearTrigger>Clear</DatePicker.ClearTrigger>
  //     </DatePicker.Control>
  //     <DatePicker.Portal>
  //       <DatePicker.Positioner>
  //         <DatePicker.Content>
  //           <DatePicker.YearSelect />
  //           <DatePicker.MonthSelect />
  //           <DatePicker.View view='day'>
  //             <DatePicker.Context>
  //               {(datePicker: any) => (
  //                 <>
  //                   <DatePicker.ViewControl>
  //                     <DatePicker.PrevTrigger>Prev</DatePicker.PrevTrigger>
  //                     <DatePicker.ViewTrigger>
  //                       <DatePicker.RangeText />
  //                     </DatePicker.ViewTrigger>
  //                     <DatePicker.NextTrigger>Next</DatePicker.NextTrigger>
  //                   </DatePicker.ViewControl>
  //                   <DatePicker.Table>
  //                     <DatePicker.TableHead>
  //                       <DatePicker.TableRow>
  //                         {datePicker.weekDays.map((weekDay, id) => (
  //                           <DatePicker.TableHeader key={id}>{weekDay.short}</DatePicker.TableHeader>
  //                         ))}
  //                       </DatePicker.TableRow>
  //                     </DatePicker.TableHead>
  //                     <DatePicker.TableBody>
  //                       {datePicker.weeks.map((week, id) => (
  //                         <DatePicker.TableRow key={id}>
  //                           {week.map((day, id) => (
  //                             <DatePicker.TableCell key={id} value={day}>
  //                               <DatePicker.TableCellTrigger>{day.day}</DatePicker.TableCellTrigger>
  //                             </DatePicker.TableCell>
  //                           ))}
  //                         </DatePicker.TableRow>
  //                       ))}
  //                     </DatePicker.TableBody>
  //                   </DatePicker.Table>
  //                 </>
  //               )}
  //             </DatePicker.Context>
  //           </DatePicker.View>
  //           <DatePicker.View view='month'>
  //             <DatePicker.Context>
  //               {(datePicker) => (
  //                 <>
  //                   <DatePicker.ViewControl>
  //                     <DatePicker.PrevTrigger>Prev</DatePicker.PrevTrigger>
  //                     <DatePicker.ViewTrigger>
  //                       <DatePicker.RangeText />
  //                     </DatePicker.ViewTrigger>
  //                     <DatePicker.NextTrigger>Next</DatePicker.NextTrigger>
  //                   </DatePicker.ViewControl>
  //                   <DatePicker.Table>
  //                     <DatePicker.TableBody>
  //                       {datePicker.getMonthsGrid({ columns: 4, format: 'short' }).map((months, id) => (
  //                         <DatePicker.TableRow key={id}>
  //                           {months.map((month, id) => (
  //                             <DatePicker.TableCell key={id} value={month.value}>
  //                               <DatePicker.TableCellTrigger>{month.label}</DatePicker.TableCellTrigger>
  //                             </DatePicker.TableCell>
  //                           ))}
  //                         </DatePicker.TableRow>
  //                       ))}
  //                     </DatePicker.TableBody>
  //                   </DatePicker.Table>
  //                 </>
  //               )}
  //             </DatePicker.Context>
  //           </DatePicker.View>
  //           <DatePicker.View view='year'>
  //             <DatePicker.Context>
  //               {(datePicker) => (
  //                 <>
  //                   <DatePicker.ViewControl>
  //                     <DatePicker.PrevTrigger>Prev</DatePicker.PrevTrigger>
  //                     <DatePicker.ViewTrigger>
  //                       <DatePicker.RangeText />
  //                     </DatePicker.ViewTrigger>
  //                     <DatePicker.NextTrigger>Next</DatePicker.NextTrigger>
  //                   </DatePicker.ViewControl>
  //                   <DatePicker.Table>
  //                     <DatePicker.TableBody>
  //                       {datePicker.getYearsGrid({ columns: 4 }).map((years, id) => (
  //                         <DatePicker.TableRow key={id}>
  //                           {years.map((year, id) => (
  //                             <DatePicker.TableCell key={id} value={year.value}>
  //                               <DatePicker.TableCellTrigger>{year.label}</DatePicker.TableCellTrigger>
  //                             </DatePicker.TableCell>
  //                           ))}
  //                         </DatePicker.TableRow>
  //                       ))}
  //                     </DatePicker.TableBody>
  //                   </DatePicker.Table>
  //                 </>
  //               )}
  //             </DatePicker.Context>
  //           </DatePicker.View>
  //         </DatePicker.Content>
  //       </DatePicker.Positioner>
  //     </DatePicker.Portal>
  //   </DatePicker.Root>
  // );
};

export default {
  title: 'react-ui/DatePicker',
  component: DatePicker,
  render: StorybookDatePicker, // TODO(burdon): Make consistent.
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {},
};
