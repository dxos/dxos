//
// Copyright 2024 DXOS.org
//

export type SimpleTime = {
  hours: number;
  minutes: number;
  seconds: number;
};

export type SimpleDate = {
  year: number;
  month: number;
  day: number;
};

export type SimpleDateTime = SimpleDate & SimpleTime;

export class DateUtil {
  static toDateTime(date: Date): SimpleDateTime {
    return {
      ...this.toDate(date),
      ...this.toTime(date),
    };
  }

  static toDate(date: Date): SimpleDate {
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    };
  }

  static toTime(date: Date): SimpleTime {
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    };
  }
}
