//
// Copyright 2024 DXOS.org
//

/**
 * nullDate {year: 1899, month: 12, day: 30}
 */
export const functions = {
  Array: [
    {
      function: 'ARRAYFORMULA',
      description: 'Enables the array arithmetic mode for a single formula.',
      syntax: 'ARRAYFORMULA(Formula)',
    },
    {
      function: 'FILTER',
      description: 'Filters an array, based on multiple conditions (boolean arrays).',
      syntax: 'FILTER(SourceArray, BoolArray1, BoolArray2, ...BoolArrayN)',
    },
    {
      function: 'ARRAY_CONSTRAIN',
      description: 'Truncates an array to given dimensions.',
      syntax: 'ARRAY_CONSTRAIN(Array, Height, Width)',
    },
  ],
  'Date and time': [
    {
      function: 'DATE',
      description: 'Returns the specified date as the number of full days since nullDate.',
      syntax: 'DATE(Year, Month, Day)',
    },
    {
      function: 'DATEDIF',
      description: 'Calculates distance between two dates, in provided unit parameter.',
      syntax: 'DATEDIF(Date1, Date2, Units)',
    },
    {
      function: 'DATEVALUE',
      description: 'Parses a date string and returns it as the number of full days since nullDate.',
      syntax: 'DATEVALUE(Datestring)',
    },
    {
      function: 'DAY',
      description: 'Returns the day of the given date value.',
      syntax: 'DAY(Number)',
    },
    {
      function: 'DAYS',
      description: 'Calculates the difference between two date values.',
      syntax: 'DAYS(Date2, Date1)',
    },
    {
      function: 'DAYS360',
      description: 'Calculates the difference between two date values in days, in 360-day basis.',
      syntax: 'DAYS360(Date2, Date1[, Format])',
    },
    {
      function: 'EDATE',
      description:
        'Shifts the given startdate by given number of months and returns it as the number of full days since nullDate.',
      syntax: 'EDATE(Startdate, Months)',
    },
    {
      function: 'EOMONTH',
      description: 'Returns the date of the last day of a month which falls months away from the start date.',
      syntax: 'EOMONTH(Startdate, Months)',
    },
    {
      function: 'HOUR',
      description: 'Returns hour component of given time.',
      syntax: 'HOUR(Time)',
    },
    {
      function: 'INTERVAL',
      description: 'Returns interval string from given number of seconds.',
      syntax: 'INTERVAL(Seconds)',
    },
    {
      function: 'ISOWEEKNUM',
      description: 'Returns an ISO week number that corresponds to the week of year.',
      syntax: 'ISOWEEKNUM(Date)',
    },
    {
      function: 'MINUTE',
      description: 'Returns minute component of given time.',
      syntax: 'MINUTE(Time)',
    },
    {
      function: 'MONTH',
      description: 'Returns the month for the given date value.',
      syntax: 'MONTH(Number)',
    },
    {
      function: 'NETWORKDAYS',
      description: 'Returns the number of working days between two given dates.',
      syntax: 'NETWORKDAYS(Date1, Date2[, Holidays])',
    },
    {
      function: 'NETWORKDAYS.INTL',
      description: 'Returns the number of working days between two given dates.',
      syntax: 'NETWORKDAYS.INTL(Date1, Date2[, Mode [, Holidays]])',
    },
    {
      function: 'NOW',
      description: 'Returns current date + time as a number of days since nullDate.',
      syntax: 'NOW()',
    },
    {
      function: 'SECOND',
      description: 'Returns second component of given time.',
      syntax: 'SECOND(Time)',
    },
    {
      function: 'TIME',
      description: 'Returns the number that represents a given time as a fraction of full day.',
      syntax: 'TIME(Hour, Minute, Second)',
    },
    {
      function: 'TIMEVALUE',
      description: 'Parses a time string and returns a number that represents it as a fraction of a full day.',
      syntax: 'TIMEVALUE(Timestring)',
    },
    {
      function: 'TODAY',
      description: 'Returns an integer representing the current date as the number of full days since nullDate.',
      syntax: 'TODAY()',
    },
    {
      function: 'WEEKDAY',
      description: 'Computes a number between 1-7 representing the day of week.',
      syntax: 'WEEKDAY(Date, Type)',
    },
    {
      function: 'WEEKNUM',
      description: 'Returns a week number that corresponds to the week of year.',
      syntax: 'WEEKNUM(Date, Type)',
    },
    {
      function: 'WORKDAY',
      description: 'Returns the working day number of days from start day.',
      syntax: 'WORKDAY(Date, Shift[, Holidays])',
    },
    {
      function: 'WORKDAY.INTL',
      description: 'Returns the working day number of days from start day.',
      syntax: 'WORKDAY.INTL(Date, Shift[, Mode[, Holidays]])',
    },
    {
      function: 'YEAR',
      description: 'Returns the year as a number according to the internal calculation rules.',
      syntax: 'YEAR(Number)',
    },
    {
      function: 'YEARFRAC',
      description: 'Computes the difference between two date values, in fraction of years.',
      syntax: 'YEARFRAC(Date2, Date1[, Format])',
    },
  ],
  Engineering: [
    {
      function: 'BIN2DEC',
      description: 'The result is the decimal number for the binary number entered.',
      syntax: 'BIN2DEC(Number)',
    },
    {
      function: 'BIN2HEX',
      description: 'The result is the hexadecimal number for the binary number entered.',
      syntax: 'BIN2HEX(Number, Places)',
    },
    {
      function: 'BIN2OCT',
      description: 'The result is the octal number for the binary number entered.',
      syntax: 'BIN2OCT(Number, Places)',
    },
    {
      function: 'BITAND',
      description: "Returns a bitwise logical 'and' of the parameters.",
      syntax: 'BITAND(Number1, Number2)',
    },
    {
      function: 'BITLSHIFT',
      description: 'Shifts a number left by n bits.',
      syntax: 'BITLSHIFT(Number, Shift)',
    },
    {
      function: 'BITOR',
      description: "Returns a bitwise logical 'or' of the parameters.",
      syntax: 'BITOR(Number1, Number2)',
    },
    {
      function: 'BITRSHIFT',
      description: 'Shifts a number right by n bits.',
      syntax: 'BITRSHIFT(Number, Shift)',
    },
    {
      function: 'BITXOR',
      description: "Returns a bitwise logical 'exclusive or' of the parameters.",
      syntax: 'BITXOR(Number1, Number2)',
    },
    {
      function: 'COMPLEX',
      description: 'Returns complex number from Re and Im parts.',
      syntax: 'COMPLEX(Re, Im[, Symbol])',
    },
    {
      function: 'DEC2BIN',
      description: 'Returns the binary number for the decimal number entered between –512 and 511.',
      syntax: 'DEC2BIN(Number, Places)',
    },
    {
      function: 'DEC2HEX',
      description: 'Returns the hexadecimal number for the decimal number entered.',
      syntax: 'DEC2HEX(Number, Places)',
    },
    {
      function: 'DEC2OCT',
      description: 'Returns the octal number for the decimal number entered.',
      syntax: 'DEC2OCT(Number, Places)',
    },
    {
      function: 'DELTA',
      description: 'Returns TRUE (1) if both numbers are equal, otherwise returns FALSE (0).',
      syntax: 'DELTA(Number_1, Number_2)',
    },
    {
      function: 'ERF',
      description: 'Returns values of the Gaussian error integral.',
      syntax: 'ERF(Lower_Limit, Upper_Limit)',
    },
    {
      function: 'ERFC',
      description: 'Returns complementary values of the Gaussian error integral between x and infinity.',
      syntax: 'ERFC(Lower_Limit)',
    },
    {
      function: 'HEX2BIN',
      description: 'The result is the binary number for the hexadecimal number entered.',
      syntax: 'HEX2BIN(Number, Places)',
    },
    {
      function: 'HEX2DEC',
      description: 'The result is the decimal number for the hexadecimal number entered.',
      syntax: 'HEX2DEC(Number)',
    },
    {
      function: 'HEX2OCT',
      description: 'The result is the octal number for the hexadecimal number entered.',
      syntax: 'HEX2OCT(Number, Places)',
    },
    {
      function: 'IMABS',
      description: 'Returns module of a complex number.',
      syntax: 'IMABS(Complex)',
    },
    {
      function: 'IMAGINARY',
      description: 'Returns imaginary part of a complex number.',
      syntax: 'IMAGINARY(Complex)',
    },
    {
      function: 'IMARGUMENT',
      description: 'Returns argument of a complex number.',
      syntax: 'IMARGUMENT(Complex)',
    },
    {
      function: 'IMCONJUGATE',
      description: 'Returns conjugate of a complex number.',
      syntax: 'IMCONJUGATE(Complex)',
    },
    {
      function: 'IMCOS',
      description: 'Returns cosine of a complex number.',
      syntax: 'IMCOS(Complex)',
    },
    {
      function: 'IMCOSH',
      description: 'Returns hyperbolic cosine of a complex number.',
      syntax: 'IMCOSH(Complex)',
    },
    {
      function: 'IMCOT',
      description: 'Returns cotangens of a complex number.',
      syntax: 'IMCOT(Complex)',
    },
    {
      function: 'IMCSC',
      description: 'Returns cosecans of a complex number.',
      syntax: 'IMCSC(Complex)',
    },
    {
      function: 'IMCSCH',
      description: 'Returns hyperbolic cosecans of a complex number.',
      syntax: 'IMCSCH(Complex)',
    },
    {
      function: 'IMDIV',
      description: 'Divides two complex numbers.',
      syntax: 'IMDIV(Complex1, Complex2)',
    },
    {
      function: 'IMEXP',
      description: 'Returns exponent of a complex number.',
      syntax: 'IMEXP(Complex)',
    },
    {
      function: 'IMLN',
      description: 'Returns natural logarithm of a complex number.',
      syntax: 'IMLN(Complex)',
    },
    {
      function: 'IMLOG2',
      description: 'Returns binary logarithm of a complex number.',
      syntax: 'IMLOG2(Complex)',
    },
    {
      function: 'IMLOG10',
      description: 'Returns base-10 logarithm of a complex number.',
      syntax: 'IMLOG10(Complex)',
    },
    {
      function: 'IMPOWER',
      description: 'Returns a complex number raised to a given power.',
      syntax: 'IMPOWER(Complex, Number)',
    },
    {
      function: 'IMPRODUCT',
      description: 'Multiplies complex numbers.',
      syntax: 'IMPRODUCT(Complex1, Complex2, ...ComplexN)',
    },
    {
      function: 'IMREAL',
      description: 'Returns real part of a complex number.',
      syntax: 'IMREAL(Complex)',
    },
    {
      function: 'IMSEC',
      description: 'Returns the secant of a complex number.',
      syntax: 'IMSEC(Complex)',
    },
    {
      function: 'IMSECH',
      description: 'Returns the hyperbolic secant of a complex number.',
      syntax: 'IMSECH(Complex)',
    },
    {
      function: 'IMSIN',
      description: 'Returns sine of a complex number.',
      syntax: 'IMSIN(Complex)',
    },
    {
      function: 'IMSINH',
      description: 'Returns hyperbolic sine of a complex number.',
      syntax: 'IMSINH(Complex)',
    },
    {
      function: 'IMSQRT',
      description: 'Returns a square root of a complex number.',
      syntax: 'IMSQRT(Complex)',
    },
    {
      function: 'IMSUB',
      description: 'Subtracts two complex numbers.',
      syntax: 'IMSUB(Complex1, Complex2)',
    },
    {
      function: 'IMSUM',
      description: 'Adds complex numbers.',
      syntax: 'IMSUM(Complex1, Complex2, ..ComplexN)',
    },
    {
      function: 'IMTAN',
      description: 'Returns the tangent of a complex number.',
      syntax: 'IMTAN(Complex)',
    },
    {
      function: 'OCT2BIN',
      description: 'The result is the binary number for the octal number entered.',
      syntax: 'OCT2BIN(Number, Places)',
    },
    {
      function: 'OCT2DEC',
      description: 'The result is the decimal number for the octal number entered.',
      syntax: 'OCT2DEC(Number)',
    },
    {
      function: 'OCT2HEX',
      description: 'The result is the hexadecimal number for the octal number entered.',
      syntax: 'OCT2HEX(Number, Places)',
    },
  ],
  Information: [
    {
      function: 'ISBINARY',
      description: 'Returns TRUE if provided value is a valid binary number.',
      syntax: 'ISBINARY(Value)',
    },
    {
      function: 'ISBLANK',
      description: 'Returns TRUE if the reference to a cell is blank.',
      syntax: 'ISBLANK(Value)',
    },
    {
      function: 'ISERR',
      description: 'Returns TRUE if the value is error value except #N/A!.',
      syntax: 'ISERR(Value)',
    },
    {
      function: 'ISERROR',
      description: 'Returns TRUE if the value is general error value.',
      syntax: 'ISERROR(Value)',
    },
    {
      function: 'ISEVEN',
      description: 'Returns TRUE if the value is an even integer, or FALSE if the value is odd.',
      syntax: 'ISEVEN(Value)',
    },
    {
      function: 'ISFORMULA',
      description: 'Checks whether referenced cell is a formula.',
      syntax: 'ISFORMULA(Value)',
    },
    {
      function: 'ISLOGICAL',
      description: 'Tests for a logical value (TRUE or FALSE).',
      syntax: 'ISLOGICAL(Value)',
    },
    {
      function: 'ISNA',
      description: 'Returns TRUE if the value is #N/A! error.',
      syntax: 'ISNA(Value)',
    },
    {
      function: 'ISNONTEXT',
      description: 'Tests if the cell contents are text or numbers, and returns FALSE if the contents are text.',
      syntax: 'ISNONTEXT(Value)',
    },
    {
      function: 'ISNUMBER',
      description: 'Returns TRUE if the value refers to a number.',
      syntax: 'ISNUMBER(Value)',
    },
    {
      function: 'ISODD',
      description: 'Returns TRUE if the value is odd, or FALSE if the number is even.',
      syntax: 'ISODD(Value)',
    },
    {
      function: 'ISREF',
      description: 'Returns TRUE if provided value is #REF! error.',
      syntax: 'ISREF(Value)',
    },
    {
      function: 'ISTEXT',
      description: 'Returns TRUE if the cell contents reference text.',
      syntax: 'ISTEXT(Value)',
    },
    {
      function: 'SHEET',
      description: 'Returns sheet number of a given value or a formula sheet number if no argument is provided.',
      syntax: 'SHEET([Value])',
    },
    {
      function: 'SHEETS',
      description:
        'Returns number of sheet of a given reference or number of all sheets in workbook when no argument is provided.',
      syntax: 'SHEETS([Value])',
    },
    {
      function: 'NA',
      description: 'Returns #N/A! error value.',
      syntax: 'NA(Value)',
    },
  ],
  Financial: [
    {
      function: 'CUMIPMT',
      description: 'Returns the cumulative interest paid on a loan between a start period and an end period.',
      syntax: 'CUMIPMT(Rate, Nper, Pv, Start, End, type)',
    },
    {
      function: 'CUMPRINC',
      description: 'Returns the cumulative principal paid on a loan between a start period and an end period.',
      syntax: 'CUMPRINC(Rate, Nper, Pv, Start, End, Type)',
    },
    {
      function: 'DB',
      description: 'Returns the depreciation of an asset for a period using the fixed-declining balance method.',
      syntax: 'DB(Cost, Salvage, Life, Period[, Month])',
    },
    {
      function: 'DDB',
      description: 'Returns the depreciation of an asset for a period using the double-declining balance method.',
      syntax: 'DDB(Cost, Salvage, Life, Period[, Factor])',
    },
    {
      function: 'DOLLARDE',
      description: 'Converts a price entered with a special notation to a price displayed as a decimal number.',
      syntax: 'DOLLARDE(Price, Fraction)',
    },
    {
      function: 'DOLLARFR',
      description: 'Converts a price displayed as a decimal number to a price entered with a special notation.',
      syntax: 'DOLLARFR(Price, Fraction)',
    },
    {
      function: 'EFFECT',
      description:
        'Calculates the effective annual interest rate from a nominal interest rate and the number of compounding periods per year.',
      syntax: 'EFFECT(Nominal_rate, Npery)',
    },
    {
      function: 'FV',
      description: 'Returns the future value of an investment.',
      syntax: 'FV(Rate, Nper, Pmt[, Pv,[ Type]])',
    },
    {
      function: 'FVSCHEDULE',
      description: 'Returns the future value of an investment based on a rate schedule.',
      syntax: 'FVSCHEDULE(Pv, Schedule)',
    },
    {
      function: 'IPMT',
      description: 'Returns the interest portion of a given loan payment in a given payment period.',
      syntax: 'IPMT(Rate, Per, Nper, Pv[, Fv[, Type]])',
    },
    {
      function: 'ISPMT',
      description: 'Returns the interest paid for a given period of an investment with equal principal payments.',
      syntax: 'ISPMT(Rate, Per, Nper, Value)',
    },
    {
      function: 'MIRR',
      description: 'Returns modified internal value for cashflows.',
      syntax: 'MIRR(Flows, FRate, RRate)',
    },
    {
      function: 'NOMINAL',
      description: 'Returns the nominal interest rate.',
      syntax: 'NOMINAL(Effect_rate, Npery)',
    },
    {
      function: 'NPER',
      description:
        'Returns the number of periods for an investment assuming periodic, constant payments and a constant interest rate.',
      syntax: 'NPER(Rate, Pmt, Pv[, Fv[, Type]])',
    },
    {
      function: 'NPV',
      description: 'Returns net present value.',
      syntax: 'NPV(Rate, Value1, Value2, ...ValueN)',
    },
    {
      function: 'PDURATION',
      description: 'Returns number of periods to reach specific value.',
      syntax: 'PDURATION(Rate, Pv, Fv)',
    },
    {
      function: 'PMT',
      description: 'Returns the periodic payment for a loan.',
      syntax: 'PMT(Rate, Nper, Pv[, Fv[, Type]])',
    },
    {
      function: 'PPMT',
      description: 'Calculates the principal portion of a given loan payment.',
      syntax: 'PPMT(Rate, Per, Nper, Pv[, Fv[, Type]])',
    },
    {
      function: 'PV',
      description: 'Returns the present value of an investment.',
      syntax: 'PV(Rate, Nper, Pmt[, Fv[, Type]])',
    },
    {
      function: 'RATE',
      description: 'Returns the interest rate per period of an annuity.',
      syntax: 'RATE(Nper, Pmt, Pv[, Fv[, Type[, guess]]])',
    },
    {
      function: 'RRI',
      description: 'Returns an equivalent interest rate for the growth of an investment.',
      syntax: 'RRI(Nper, Pv, Fv)',
    },
    {
      function: 'SLN',
      description: 'Returns the depreciation of an asset for one period, based on a straight-line method.',
      syntax: 'SLN(Cost, Salvage, Life)',
    },
    {
      function: 'SYD',
      description: "Returns the 'sum-of-years' depreciation for an asset in a period.",
      syntax: 'SYD(Cost, Salvage, Life, Period)',
    },
    {
      function: 'TBILLEQ',
      description: 'Returns the bond-equivalent yield for a Treasury bill.',
      syntax: 'TBILLEQ(Settlement, Maturity, Discount)',
    },
    {
      function: 'TBILLPRICE',
      description: 'Returns the price per $100 face value for a Treasury bill.',
      syntax: 'TBILLPRICE(Settlement, Maturity, Discount)',
    },
    {
      function: 'TBILLYIELD',
      description: 'Returns the yield for a Treasury bill.',
      syntax: 'TBILLYIELD(Settlement, Maturity, Price)',
    },
    {
      function: 'XNPV',
      description: 'Returns net present value.',
      syntax: 'XNPV(Rate, Payments, Dates)',
    },
  ],
  Logical: [
    {
      function: 'AND',
      description: 'Returns TRUE if all arguments are TRUE.',
      syntax: 'AND(Logical_value1, Logical_value2, ...Logical_valueN)',
    },
    {
      function: 'FALSE',
      description: 'Returns the logical value FALSE.',
      syntax: 'FALSE()',
    },
    {
      function: 'IF',
      description: 'Specifies a logical test to be performed.',
      syntax: 'IF(Test, Then_value, Otherwise_value)',
    },
    {
      function: 'IFS',
      description: 'Evaluates multiple logical tests and returns a value that corresponds to the first true condition.',
      syntax: 'IFS(Condition1, Value1 [, Condition2, Value2 [, ...ConditionN, ValueN]])',
    },
    {
      function: 'IFNA',
      description:
        'Returns the value if the cell does not contains the #N/A (value not available) error value, or the alternative value if it does.',
      syntax: 'IFNA(Value, Alternate_value)',
    },
    {
      function: 'IFERROR',
      description:
        'Returns the value if the cell does not contains an error value, or the alternative value if it does.',
      syntax: 'IFERROR(Value, Alternate_value)',
    },
    {
      function: 'NOT',
      description: 'Complements (inverts) a logical value.',
      syntax: 'NOT(Logicalvalue)',
    },
    {
      function: 'SWITCH',
      description: 'Evaluates a list of arguments, consisting of an expression followed by a value.',
      syntax: 'SWITCH(Expression1, Value1 [, Expression2, Value2 [, ...ExpressionN, ValueN]])',
    },
    {
      function: 'OR',
      description: 'Returns TRUE if at least one argument is TRUE.',
      syntax: 'OR(Logical_value1, Logical_value2, ...Logical_valueN)',
    },
    {
      function: 'TRUE',
      description: 'The logical value is set to TRUE.',
      syntax: 'TRUE()',
    },
    {
      function: 'XOR',
      description: 'Returns true if an odd number of arguments evaluates to TRUE.',
      syntax: 'XOR(Logical_value1, Logical_value2, ...Logical_valueN)',
    },
  ],
  'Lookup and reference': [
    {
      function: 'ADDRESS',
      description: 'Returns a cell reference as a string.',
      syntax: 'ADDRESS(Row, Column[, AbsoluteRelativeMode[, UseA1Notation[, Sheet]]])',
    },
    {
      function: 'CHOOSE',
      description: 'Uses an index to return a value from a list of values.',
      syntax: 'CHOOSE(Index, Value1, Value2, ...ValueN)',
    },
    {
      function: 'COLUMN',
      description: 'Returns column number of a given reference or formula reference if argument not provided.',
      syntax: 'COLUMNS([Reference])',
    },
    {
      function: 'COLUMNS',
      description: 'Returns the number of columns in the given reference.',
      syntax: 'COLUMNS(Array)',
    },
    {
      function: 'FORMULATEXT',
      description: 'Returns a formula in a given cell as a string.',
      syntax: 'FORMULATEXT(Reference)',
    },
    {
      function: 'HLOOKUP',
      description: 'Searches horizontally with reference to adjacent cells to the bottom.',
      syntax: 'HLOOKUP(Search_Criterion, Array, Index, Sort_Order)',
    },
    {
      function: 'HYPERLINK',
      description: "Stores the url in the cell's metadata.",
      syntax: 'HYPERLINK(Url[, LinkLabel])',
    },
    {
      function: 'INDEX',
      description:
        'Returns the contents of a cell specified by row and column number. The column number is optional and defaults to 1.',
      syntax: 'INDEX(Range, Row [, Column])',
    },
    {
      function: 'MATCH',
      description: 'Returns the relative position of an item in an array that matches a specified value.',
      syntax: 'MATCH(Searchcriterion, Lookuparray [, MatchType])',
    },
    {
      function: 'OFFSET',
      description:
        'Returns the value of a cell offset by a certain number of rows and columns from a given reference point.',
      syntax: 'OFFSET(Reference, Rows, Columns, Height, Width)',
    },
    {
      function: 'ROW',
      description: 'Returns row number of a given reference or formula reference if argument not provided.',
      syntax: 'ROW([Reference])',
    },
    {
      function: 'ROWS',
      description: 'Returns the number of rows in the given reference.',
      syntax: 'ROWS(Array)',
    },
    {
      function: 'VLOOKUP',
      description: 'Searches vertically with reference to adjacent cells to the right.',
      syntax: 'VLOOKUP(Search_Criterion, Array, Index, Sort_Order)',
    },
  ],
  'Math and trigonometry': [
    {
      function: 'ABS',
      description: 'Returns the absolute value of a number.',
      syntax: 'ABS(Number)',
    },
    {
      function: 'ACOS',
      description: 'Returns the inverse trigonometric cosine of a number.',
      syntax: 'ACOS(Number)',
    },
    {
      function: 'ACOSH',
      description: 'Returns the inverse hyperbolic cosine of a number.',
      syntax: 'ACOSH(Number)',
    },
    {
      function: 'ACOT',
      description: 'Returns the inverse trigonometric cotangent of a number.',
      syntax: 'ACOT(Number)',
    },
    {
      function: 'ACOTH',
      description: 'Returns the inverse hyperbolic cotangent of a number.',
      syntax: 'ACOTH(Number)',
    },
    {
      function: 'ARABIC',
      description: 'Converts number from roman form.',
      syntax: 'ARABIC(String)',
    },
    {
      function: 'ASIN',
      description: 'Returns the inverse trigonometric sine of a number.',
      syntax: 'ASIN(Number)',
    },
    {
      function: 'ASINH',
      description: 'Returns the inverse hyperbolic sine of a number.',
      syntax: 'ASINH(Number)',
    },
    {
      function: 'ATAN',
      description: 'Returns the inverse trigonometric tangent of a number.',
      syntax: 'ATAN(Number)',
    },
    {
      function: 'ATAN2',
      description: 'Returns the inverse trigonometric tangent of the specified x and y coordinates.',
      syntax: 'ATAN2(Numberx, Numbery)',
    },
    {
      function: 'ATANH',
      description: 'Returns the inverse hyperbolic tangent of a number.',
      syntax: 'ATANH(Number)',
    },
    {
      function: 'BASE',
      description: 'Converts a positive integer to a specified base into a text from the numbering system.',
      syntax: 'BASE(Number, Radix, [Minimumlength])',
    },
    {
      function: 'CEILING',
      description: 'Rounds a number up to the nearest multiple of Significance.',
      syntax: 'CEILING(Number, Significance)',
    },
    {
      function: 'CEILING.MATH',
      description: 'Rounds a number up to the nearest multiple of Significance.',
      syntax: 'CEILING.MATH(Number[, Significance[, Mode]])',
    },
    {
      function: 'CEILING.PRECISE',
      description: 'Rounds a number up to the nearest multiple of Significance.',
      syntax: 'CEILING.PRECISE(Number[, Significance])',
    },
    {
      function: 'COMBIN',
      description: 'Returns number of combinations (without repetitions).',
      syntax: 'COMBIN(Number, Number)',
    },
    {
      function: 'COMBINA',
      description: 'Returns number of combinations (with repetitions).',
      syntax: 'COMBINA(Number, Number)',
    },
    {
      function: 'COS',
      description: 'Returns the cosine of the given angle (in radians).',
      syntax: 'COS(Number)',
    },
    {
      function: 'COSH',
      description: 'Returns the hyperbolic cosine of the given value.',
      syntax: 'COSH(Number)',
    },
    {
      function: 'COT',
      description: 'Returns the cotangent of the given angle (in radians).',
      syntax: 'COT(Number)',
    },
    {
      function: 'COTH',
      description: 'Returns the hyperbolic cotangent of the given value.',
      syntax: 'COTH(Number)',
    },
    {
      function: 'COUNTUNIQUE',
      description: 'Counts the number of unique values in a list of specified values and ranges.',
      syntax: 'COUNTUNIQUE(Value1, Value2, ...ValueN)',
    },
    {
      function: 'CSC',
      description: 'Returns the cosecans of the given angle (in radians).',
      syntax: 'CSC(Number)',
    },
    {
      function: 'CSCH',
      description: 'Returns the hyperbolic cosecant of the given value.',
      syntax: 'CSCH(Number)',
    },
    {
      function: 'DECIMAL',
      description: 'Converts text with characters from a number system to a positive integer in the base radix given.',
      syntax: 'DECIMAL("Text", Radix)',
    },
    {
      function: 'DEGREES',
      description: 'Converts radians into degrees.',
      syntax: 'DEGREES(Number)',
    },
    {
      function: 'EVEN',
      description:
        'Rounds a positive number up to the next even integer and a negative number down to the next even integer.',
      syntax: 'EVEN(Number)',
    },
    {
      function: 'EXP',
      description: 'Returns constant e raised to the power of a number.',
      syntax: 'EXP(Number)',
    },
    {
      function: 'FACT',
      description: 'Returns a factorial of a number.',
      syntax: 'FACT(Number)',
    },
    {
      function: 'FACTDOUBLE',
      description: 'Returns a double factorial of a number.',
      syntax: 'FACTDOUBLE(Number)',
    },
    {
      function: 'FLOOR',
      description: 'Rounds a number down to the nearest multiple of Significance.',
      syntax: 'FLOOR(Number, Significance)',
    },
    {
      function: 'FLOOR.MATH',
      description: 'Rounds a number down to the nearest multiple of Significance.',
      syntax: 'FLOOR.MATH(Number[, Significance[, Mode]])',
    },
    {
      function: 'FLOOR.PRECISE',
      description: 'Rounds a number down to the nearest multiple of Significance.',
      syntax: 'FLOOR.PRECISE(Number[, Significance])',
    },
    {
      function: 'GCD',
      description: 'Computes greatest common divisor of numbers.',
      syntax: 'GCD(Number1, Number2, ...NumberN)',
    },
    {
      function: 'INT',
      description: 'Rounds a number down to the nearest integer.',
      syntax: 'INT(Number)',
    },
    {
      function: 'ISO.CEILING',
      description: 'Rounds a number up to the nearest multiple of Significance.',
      syntax: 'ISO.CEILING(Number[, Significance])',
    },
    {
      function: 'LCM',
      description: 'Computes least common multiplicity of numbers.',
      syntax: 'LCM(Number1, Number2, ...NumberN)',
    },
    {
      function: 'LN',
      description: 'Returns the natural logarithm based on the constant e of a number.',
      syntax: 'LN(Number)',
    },
    {
      function: 'LOG',
      description: 'Returns the logarithm of a number to the specified base.',
      syntax: 'LOG(Number, Base)',
    },
    {
      function: 'LOG10',
      description: 'Returns the base-10 logarithm of a number.',
      syntax: 'LOG10(Number)',
    },
    {
      function: 'MOD',
      description: 'Returns the remainder when one integer is divided by another.',
      syntax: 'MOD(Dividend, Divisor)',
    },
    {
      function: 'MROUND',
      description: 'Rounds number to the nearest multiplicity.',
      syntax: 'MROUND(Number, Base)',
    },
    {
      function: 'MULTINOMIAL',
      description: 'Returns number of multiset combinations.',
      syntax: 'MULTINOMIAL(Number1, Number2, ...NumberN)',
    },
    {
      function: 'ODD',
      description:
        'Rounds a positive number up to the nearest odd integer and a negative number down to the nearest odd integer.',
      syntax: 'ODD(Number)',
    },
    {
      function: 'PI',
      description: 'Returns 3.14159265358979, the value of the mathematical constant PI to 14 decimal places.',
      syntax: 'PI()',
    },
    {
      function: 'POWER',
      description: 'Returns a number raised to another number.',
      syntax: 'POWER(Base, Exponent)',
    },
    {
      function: 'PRODUCT',
      description: 'Returns product of numbers.',
      syntax: 'PRODUCT(Number1, Number2, ...NumberN)',
    },
    {
      function: 'QUOTIENT',
      description: 'Returns integer part of a division.',
      syntax: 'QUOTIENT(Dividend, Divisor)',
    },
    {
      function: 'RADIANS',
      description: 'Converts degrees to radians.',
      syntax: 'RADIANS(Number)',
    },
    {
      function: 'RAND',
      description: 'Returns a random number between 0 and 1.',
      syntax: 'RAND()',
    },
    {
      function: 'RANDBETWEEN',
      description: 'Returns a random integer between two numbers.',
      syntax: 'RAND(Lowerbound, Upperbound)',
    },
    {
      function: 'ROMAN',
      description: 'Converts number to roman form.',
      syntax: 'ROMAN(Number[, Mode])',
    },
    {
      function: 'ROUND',
      description: 'Rounds a number to a certain number of decimal places.',
      syntax: 'ROUND(Number, Count)',
    },
    {
      function: 'ROUNDDOWN',
      description: 'Rounds a number down, toward zero, to a certain precision.',
      syntax: 'ROUNDDOWN(Number, Count)',
    },
    {
      function: 'ROUNDUP',
      description: 'Rounds a number up, away from zero, to a certain precision.',
      syntax: 'ROUNDUP(Number, Count)',
    },
    {
      function: 'SEC',
      description: 'Returns the secant of the given angle (in radians).',
      syntax: 'SEC(Number)',
    },
    {
      function: 'SECH',
      description: 'Returns the hyperbolic secant of the given angle (in radians).',
      syntax: 'SEC(Number)',
    },
    {
      function: 'SERIESSUM',
      description: 'Evaluates series at a point.',
      syntax: 'SERIESSUM(Number, Number, Number, Coefficients)',
    },
    {
      function: 'SIN',
      description: 'Returns the sine of the given angle (in radians).',
      syntax: 'SIN(Number)',
    },
    {
      function: 'SINH',
      description: 'Returns the hyperbolic sine of the given value.',
      syntax: 'SINH(Number)',
    },
    {
      function: 'SIGN',
      description: 'Returns sign of a number.',
      syntax: 'SIGN(Number)',
    },
    {
      function: 'SQRT',
      description: 'Returns the positive square root of a number.',
      syntax: 'SQRT(Number)',
    },
    {
      function: 'SQRTPI',
      description: 'Returns sqrt of number times pi.',
      syntax: 'SQRTPI(Number)',
    },
    {
      function: 'SUBTOTAL',
      description: 'Computes aggregation using function specified by number.',
      syntax: 'SUBTOTAL(Function, Number1, Number2, ...NumberN)',
    },
    {
      function: 'SUM',
      description: 'Sums up the values of the specified cells.',
      syntax: 'SUM(Number1, Number2, ...NumberN)',
    },
    {
      function: 'SUMIF',
      description: 'Sums up the values of cells that belong to the specified range and meet the specified condition.',
      syntax: 'SUMIF(Range, Criteria, Sumrange)',
    },
    {
      function: 'SUMIFS',
      description:
        'Sums up the values of cells that belong to the specified range and meet the specified sets of conditions.',
      syntax:
        'SUMIFS(Sum_Range, Criterion_range1, Criterion1 [, Criterion_range2, Criterion2 [, ...Criterion_rangeN, CriterionN]])',
    },
    {
      function: 'SUMPRODUCT',
      description: 'Multiplies corresponding elements in the given arrays, and returns the sum of those products.',
      syntax: 'SUMPRODUCT(Array1, Array2, ...ArrayN)',
    },
    {
      function: 'SUMSQ',
      description: 'Returns the sum of the squares of the arguments',
      syntax: 'SUMSQ(Number1, Number2, ...NumberN)',
    },
    {
      function: 'SUMX2MY2',
      description: 'Returns the sum of the square differences.',
      syntax: 'SUMX2MY2(Range1, Range2)',
    },
    {
      function: 'SUMX2PY2',
      description: 'Returns the sum of the square sums.',
      syntax: 'SUMX2PY2(Range1, Range2)',
    },
    {
      function: 'SUMXMY2',
      description: 'Returns the sum of the square of differences.',
      syntax: 'SUMXMY2(Range1, Range2)',
    },
    {
      function: 'TAN',
      description: 'Returns the tangent of the given angle (in radians).',
      syntax: 'TAN(Number)',
    },
    {
      function: 'TANH',
      description: 'Returns the hyperbolic tangent of the given value.',
      syntax: 'TANH(Number)',
    },
    {
      function: 'TRUNC',
      description: 'Truncates a number by removing decimal places.',
      syntax: 'TRUNC(Number, Count)',
    },
  ],
  'Matrix functions': [
    {
      function: 'MMULT',
      description: 'Calculates the array product of two arrays.',
      syntax: 'MMULT(Array, Array)',
    },
    {
      function: 'MEDIANPOOL',
      description:
        'Calculates a smaller range which is a median of a Window_size, in a given Range, for every Stride element.',
      syntax: 'MEDIANPOOL(Range, Window_size, Stride)',
    },
    {
      function: 'MAXPOOL',
      description:
        'Calculates a smaller range which is a maximum of a Window_size, in a given Range, for every Stride element.',
      syntax: 'MAXPOOL(Range, Window_size, Stride)',
    },
    {
      function: 'TRANSPOSE',
      description: 'Transposes the rows and columns of an array.',
      syntax: 'TRANSPOSE(Array)',
    },
  ],
  Operator: [
    {
      function: 'HF.ADD',
      description: 'Adds two values.',
      syntax: 'HF.ADD(Number, Number)',
    },
    {
      function: 'HF.CONCAT',
      description: 'Concatenates two strings.',
      syntax: 'HF.CONCAT(String, String)',
    },
    {
      function: 'HF.DIVIDE',
      description: 'Divides two values.',
      syntax: 'HF.DIVIDE(Number, Number)',
    },
    {
      function: 'HF.EQ',
      description: 'Tests two values for equality.',
      syntax: 'HF.EQ(Value, Value)',
    },
    {
      function: 'HF.LTE',
      description: 'Tests two values for less-equal relation.',
      syntax: 'HF.LEQ(Value, Value)',
    },
    {
      function: 'HF.LT',
      description: 'Tests two values for less-than relation.',
      syntax: 'HF.LT(Value, Value)',
    },
    {
      function: 'HF.GTE',
      description: 'Tests two values for greater-equal relation.',
      syntax: 'HF.GEQ(Value, Value)',
    },
    {
      function: 'HF.GT',
      description: 'Tests two values for greater-than relation.',
      syntax: 'HF.GT(Value, Value)',
    },
    {
      function: 'HF.MINUS',
      description: 'Subtracts two values.',
      syntax: 'HF.MINUS(Number, Number)',
    },
    {
      function: 'HF.MULTIPLY',
      description: 'Multiplies two values.',
      syntax: 'HF.MULTIPLY(Number, Number)',
    },
    {
      function: 'HF.NE',
      description: 'Tests two values for inequality.',
      syntax: 'HF.NE(Value, Value)',
    },
    {
      function: 'HF.POW',
      description: 'Computes power of two values.',
      syntax: 'HF.POW(Number, Number)',
    },
    {
      function: 'HF.UMINUS',
      description: 'Negates the value.',
      syntax: 'HF.UMINUS(Number)',
    },
    {
      function: 'HF.UNARY_PERCENT',
      description: 'Applies percent operator.',
      syntax: 'HF.UNARY_PERCENT(Number)',
    },
    {
      function: 'HF.UPLUS',
      description: 'Applies unary plus.',
      syntax: 'HF.UPLUS(Number)',
    },
  ],
  Statistical: [
    {
      function: 'AVEDEV',
      description: 'Returns the average deviation of the arguments.',
      syntax: 'AVEDEV(Number1, Number2, ...NumberN)',
    },
    {
      function: 'AVERAGE',
      description: 'Returns the average of the arguments.',
      syntax: 'AVERAGE(Number1, Number2, ...NumberN)',
    },
    {
      function: 'AVERAGEA',
      description: 'Returns the average of the arguments.',
      syntax: 'AVERAGEA(Value1, Value2, ...ValueN)',
    },
    {
      function: 'AVERAGEIF',
      description: 'Returns the arithmetic mean of all cells in a range that satisfy a given condition.',
      syntax: 'AVERAGEIF(Range, Criterion [, Average_Range ])',
    },
    {
      function: 'BESSELI',
      description: 'Returns value of Bessel function.',
      syntax: 'BESSELI(x, n)',
    },
    {
      function: 'BESSELJ',
      description: 'Returns value of Bessel function.',
      syntax: 'BESSELJ(x, n)',
    },
    {
      function: 'BESSELK',
      description: 'Returns value of Bessel function.',
      syntax: 'BESSELK(x, n)',
    },
    {
      function: 'BESSELY',
      description: 'Returns value of Bessel function.',
      syntax: 'BESSELY(x, n)',
    },
    {
      function: 'BETA.DIST',
      description: 'Returns the density of Beta distribution.',
      syntax: 'BETA.DIST(Number1, Number2, Number3, Boolean[, Number4[, Number5]])',
    },
    {
      function: 'BETADIST',
      description: 'Returns the density of Beta distribution.',
      syntax: 'BETADIST(Number1, Number2, Number3, Boolean[, Number4[, Number5]])',
    },
    {
      function: 'BETA.INV',
      description: 'Returns the inverse Beta distribution value.',
      syntax: 'BETA.INV(Number1, Number2, Number3[, Number4[, Number5]])',
    },
    {
      function: 'BETAINV',
      description: 'Returns the inverse of Beta distribution value.',
      syntax: 'BETAINV(Number1, Number2, Number3[, Number4[, Number5]])',
    },
    {
      function: 'BINOM.DIST',
      description: 'Returns density of binomial distribution.',
      syntax: 'BINOM.DIST(Number1, Number2, Number3, Boolean)',
    },
    {
      function: 'BINOMDIST',
      description: 'Returns density of binomial distribution.',
      syntax: 'BINOMDIST(Number1, Number2, Number3, Boolean)',
    },
    {
      function: 'BINOM.INV',
      description: 'Returns inverse binomial distribution value.',
      syntax: 'BINOM.INV(Number1, Number2, Number3)',
    },
    {
      function: 'CHIDIST',
      description: 'Returns probability of chi-square right-side distribution.',
      syntax: 'CHIDIST(X, Degrees)',
    },
    {
      function: 'CHIINV',
      description: 'Returns inverse of chi-square right-side distribution.',
      syntax: 'CHIINV(P, Degrees)',
    },
    {
      function: 'CHIINVRT',
      description: 'Returns inverse of chi-square right-side distribution.',
      syntax: 'CHIINVRT(P, Degrees)',
    },
    {
      function: 'CHISQ.DIST',
      description: 'Returns value of chi-square distribution.',
      syntax: 'CHISQ.DIST(X, Degrees, Mode)',
    },
    {
      function: 'CHIDISTRT',
      description: 'Returns probability of chi-square right-side distribution.',
      syntax: 'CHIDISTRT(X, Degrees)',
    },
    {
      function: 'CHISQ.DIST.RT',
      description: 'Returns probability of chi-square right-side distribution.',
      syntax: 'CHISQ.DIST.RT(X, Degrees)',
    },
    {
      function: 'CHISQ.INV',
      description: 'Returns inverse of chi-square distribution.',
      syntax: 'CHISQ.INV.RT(P, Degrees)',
    },
    {
      function: 'CHISQ.INV.RT',
      description: 'Returns inverse of chi-square right-side distribution.',
      syntax: 'CHISQ.INV.RT(P, Degrees)',
    },
    {
      function: 'CHISQ.TEST',
      description: 'Returns chi-squared-test value for a dataset.',
      syntax: 'CHISQ.TEST(Array1, Array2)',
    },
    {
      function: 'CHITEST',
      description: 'Returns chi-squared-test value for a dataset.',
      syntax: 'CHITEST(Array1, Array2)',
    },
    {
      function: 'CONFIDENCE',
      description: 'Returns upper confidence bound for normal distribution.',
      syntax: 'CONFIDENCE(Alpha, Stdev, Size)',
    },
    {
      function: 'CONFIDENCE.NORM',
      description: 'Returns upper confidence bound for normal distribution.',
      syntax: 'CONFIDENCE.NORM(Alpha, Stdev, Size)',
    },
    {
      function: 'CONFIDENCE.T',
      description: 'Returns upper confidence bound for T distribution.',
      syntax: 'CONFIDENCE.T(Alpha, Stdev, Size)',
    },
    {
      function: 'CORREL',
      description: 'Returns the correlation coefficient between two data sets.',
      syntax: 'CORREL(Data1, Data2)',
    },
    {
      function: 'COUNT',
      description: 'Counts how many numbers are in the list of arguments.',
      syntax: 'COUNT(Value1, Value2, ...ValueN)',
    },
    {
      function: 'COUNTA',
      description: 'Counts how many values are in the list of arguments.',
      syntax: 'COUNTA(Value1, Value2, ...ValueN)',
    },
    {
      function: 'COUNTBLANK',
      description: 'Returns the number of empty cells.',
      syntax: 'COUNTBLANK(Range)',
    },
    {
      function: 'COUNTIF',
      description: 'Returns the number of cells that meet with certain criteria within a cell range.',
      syntax: 'COUNTIF(Range, Criteria)',
    },
    {
      function: 'COUNTIFS',
      description: 'Returns the count of rows or columns that meet criteria in multiple ranges.',
      syntax: 'COUNTIFS(Range1, Criterion1 [, Range2, Criterion2 [, ...RangeN, CriterionN]])',
    },
    {
      function: 'COVAR',
      description: 'Returns the covariance between two data sets, population normalized.',
      syntax: 'COVAR(Data1, Data2)',
    },
    {
      function: 'COVARIANCE.P',
      description: 'Returns the covariance between two data sets, population normalized.',
      syntax: 'COVARIANCE.P(Data1, Data2)',
    },
    {
      function: 'COVARIANCEP',
      description: 'Returns the covariance between two data sets, population normalized.',
      syntax: 'COVARIANCEP(Data1, Data2)',
    },
    {
      function: 'COVARIANCE.S',
      description: 'Returns the covariance between two data sets, sample normalized.',
      syntax: 'COVARIANCE.S(Data1, Data2)',
    },
    {
      function: 'COVARIANCES',
      description: 'Returns the covariance between two data sets, sample normalized.',
      syntax: 'COVARIANCES(Data1, Data2)',
    },
    {
      function: 'CRITBINOM',
      description: 'Returns inverse binomial distribution value.',
      syntax: 'CRITBINOM(Number1, Number2, Number3)',
    },
    {
      function: 'DEVSQ',
      description: 'Returns sum of squared deviations.',
      syntax: 'DEVSQ(Number1, Number2, ...NumberN)',
    },
    {
      function: 'EXPON.DIST',
      description: 'Returns density of an exponential distribution.',
      syntax: 'EXPON.DIST(Number1, Number2, Boolean)',
    },
    {
      function: 'EXPONDIST',
      description: 'Returns density of an exponential distribution.',
      syntax: 'EXPONDIST(Number1, Number2, Boolean)',
    },
    {
      function: 'FDIST',
      description: 'Returns probability of F right-side distribution.',
      syntax: 'FDIST(X, Degree1, Degree2)',
    },
    {
      function: 'FINV',
      description: 'Returns inverse of F right-side distribution.',
      syntax: 'FINV(P, Degree1, Degree2)',
    },
    {
      function: 'F.DIST',
      description: 'Returns value of F distribution.',
      syntax: 'F.DIST(X, Degree1, Degree2, Mode)',
    },
    {
      function: 'F.DIST.RT',
      description: 'Returns probability of F right-side distribution.',
      syntax: 'F.DIST.RT(X, Degree1, Degree2)',
    },
    {
      function: 'FDISTRT',
      description: 'Returns probability of F right-side distribution.',
      syntax: 'FDISTRT(X, Degree1, Degree2)',
    },
    {
      function: 'F.INV',
      description: 'Returns inverse of F distribution.',
      syntax: 'F.INV.RT(P, Degree1, Degree2)',
    },
    {
      function: 'F.INV.RT',
      description: 'Returns inverse of F right-side distribution.',
      syntax: 'F.INV.RT(P, Degree1, Degree2)',
    },
    {
      function: 'FINVRT',
      description: 'Returns inverse of F right-side distribution.',
      syntax: 'FINVRT(P, Degree1, Degree2)',
    },
    {
      function: 'FISHER',
      description: 'Returns Fisher transformation value.',
      syntax: 'FISHER(Number)',
    },
    {
      function: 'FISHERINV',
      description: 'Returns inverse Fisher transformation value.',
      syntax: 'FISHERINV(Number)',
    },
    {
      function: 'F.TEST',
      description: 'Returns f-test value for a dataset.',
      syntax: 'Z.TEST(Array1, Array2)',
    },
    {
      function: 'FTEST',
      description: 'Returns f-test value for a dataset.',
      syntax: 'ZTEST(Array1, Array2)',
    },
    {
      function: 'GAMMA',
      description: 'Returns value of Gamma function.',
      syntax: 'GAMMA(Number)',
    },
    {
      function: 'GAMMA.DIST',
      description: 'Returns density of Gamma distribution.',
      syntax: 'GAMMA.DIST(Number1, Number2, Number3, Boolean)',
    },
    {
      function: 'GAMMADIST',
      description: 'Returns density of Gamma distribution.',
      syntax: 'GAMMADIST(Number1, Number2, Number3, Boolean)',
    },
    {
      function: 'GAMMALN',
      description: 'Returns natural logarithm of Gamma function.',
      syntax: 'GAMMALN(Number)',
    },
    {
      function: 'GAMMALN.PRECISE',
      description: 'Returns natural logarithm of Gamma function.',
      syntax: 'GAMMALN.PRECISE(Number)',
    },
    {
      function: 'GAMMA.INV',
      description: 'Returns inverse Gamma distribution value.',
      syntax: 'GAMMA.INV(Number1, Number2, Number3)',
    },
    {
      function: 'GAMMAINV',
      description: 'Returns inverse Gamma distribution value.',
      syntax: 'GAMMAINV(Number1, Number2, Number3)',
    },
    {
      function: 'GAUSS',
      description:
        'Returns the probability of gaussian variable fall more than this many times standard deviation from mean.',
      syntax: 'GAUSS(Number)',
    },
    {
      function: 'GEOMEAN',
      description: 'Returns the geometric average.',
      syntax: 'GEOMEAN(Number1, Number2, ...NumberN)',
    },
    {
      function: 'HARMEAN',
      description: 'Returns the harmonic average.',
      syntax: 'HARMEAN(Number1, Number2, ...NumberN)',
    },
    {
      function: 'HYPGEOMDIST',
      description: 'Returns density of hypergeometric distribution.',
      syntax: 'HYPGEOMDIST(Number1, Number2, Number3, Number4, Boolean)',
    },
    {
      function: 'HYPGEOM.DIST',
      description: 'Returns density of hypergeometric distribution.',
      syntax: 'HYPGEOM.DIST(Number1, Number2, Number3, Number4, Boolean)',
    },
    {
      function: 'LARGE',
      description: 'Returns k-th largest value in a range.',
      syntax: 'LARGE(Range, K)',
    },
    {
      function: 'LOGNORM.DIST',
      description: 'Returns density of lognormal distribution.',
      syntax: 'LOGNORM.DIST(X, Mean, Stddev, Mode)',
    },
    {
      function: 'LOGNORMDIST',
      description: 'Returns density of lognormal distribution.',
      syntax: 'LOGNORMDIST(X, Mean, Stddev, Mode)',
    },
    {
      function: 'LOGNORM.INV',
      description: 'Returns value of inverse lognormal distribution.',
      syntax: 'LOGNORM.INV(P, Mean, Stddev)',
    },
    {
      function: 'LOGNORMINV',
      description: 'Returns value of inverse lognormal distribution.',
      syntax: 'LOGNORMINV(P, Mean, Stddev)',
    },
    {
      function: 'LOGINV',
      description: 'Returns value of inverse lognormal distribution.',
      syntax: 'LOGINV(P, Mean, Stddev)',
    },
    {
      function: 'MAX',
      description: 'Returns the maximum value in a list of arguments.',
      syntax: 'MAX(Number1, Number2, ...NumberN)',
    },
    {
      function: 'MAXA',
      description: 'Returns the maximum value in a list of arguments.',
      syntax: 'MAXA(Value1, Value2, ...ValueN)',
    },
    {
      function: 'MAXIFS',
      description: 'Returns the maximum value of the cells in a range that meet a set of criteria.',
      syntax:
        'MAXIFS(Max_Range, Criterion_range1, Criterion1 [, Criterion_range2, Criterion2 [, ...Criterion_rangeN, CriterionN]])',
    },
    {
      function: 'MEDIAN',
      description: 'Returns the median of a set of numbers.',
      syntax: 'MEDIAN(Number1, Number2, ...NumberN)',
    },
    {
      function: 'MIN',
      description: 'Returns the minimum value in a list of arguments.',
      syntax: 'MIN(Number1, Number2, ...NumberN)',
    },
    {
      function: 'MINA',
      description: 'Returns the minimum value in a list of arguments.',
      syntax: 'MINA(Value1, Value2, ...ValueN)',
    },
    {
      function: 'MINIFS',
      description: 'Returns the minimum value of the cells in a range that meet a set of criteria.',
      syntax:
        'MINIFS(Min_Range, Criterion_range1, Criterion1 [, Criterion_range2, Criterion2 [, ...Criterion_rangeN, CriterionN]])',
    },
    {
      function: 'NEGBINOM.DIST',
      description: 'Returns density of negative binomial distribution.',
      syntax: 'NEGBINOM.DIST(Number1, Number2, Number3, Mode)',
    },
    {
      function: 'NEGBINOMDIST',
      description: 'Returns density of negative binomial distribution.',
      syntax: 'NEGBINOMDIST(Number1, Number2, Number3, Mode)',
    },
    {
      function: 'NORM.DIST',
      description: 'Returns density of normal distribution.',
      syntax: 'NORM.DIST(X, Mean, Stddev, Mode)',
    },
    {
      function: 'NORMDIST',
      description: 'Returns density of normal distribution.',
      syntax: 'NORMDIST(X, Mean, Stddev, Mode)',
    },
    {
      function: 'NORM.S.DIST',
      description: 'Returns density of normal distribution.',
      syntax: 'NORM.S.DIST(X, Mode)',
    },
    {
      function: 'NORMDIST',
      description: 'Returns density of normal distribution.',
      syntax: 'NORMSDIST(X, Mode)',
    },
    {
      function: 'NORM.INV',
      description: 'Returns value of inverse normal distribution.',
      syntax: 'NORM.INV(P, Mean, Stddev)',
    },
    {
      function: 'NORMINV',
      description: 'Returns value of inverse normal distribution.',
      syntax: 'NORMINV(P, Mean, Stddev)',
    },
    {
      function: 'NORM.S.INV',
      description: 'Returns value of inverse normal distribution.',
      syntax: 'NORM.S.INV(P)',
    },
    {
      function: 'NORMSINV',
      description: 'Returns value of inverse normal distribution.',
      syntax: 'NORMSINV(P)',
    },
    {
      function: 'PEARSON',
      description: 'Returns the correlation coefficient between two data sets.',
      syntax: 'PEARSON(Data1, Data2)',
    },
    {
      function: 'PHI',
      description: 'Returns probability density of normal distribution.',
      syntax: 'PHI(X)',
    },
    {
      function: 'POISSON',
      description: 'Returns density of Poisson distribution.',
      syntax: 'POISSON(X, Mean, Mode)',
    },
    {
      function: 'POISSON.DIST',
      description: 'Returns density of Poisson distribution.',
      syntax: 'POISSON.DIST(X, Mean, Mode)',
    },
    {
      function: 'POISSONDIST',
      description: 'Returns density of Poisson distribution.',
      syntax: 'POISSONDIST(X, Mean, Mode)',
    },
    {
      function: 'RSQ',
      description: 'Returns the squared correlation coefficient between two data sets.',
      syntax: 'RSQ(Data1, Data2)',
    },
    {
      function: 'SKEW',
      description: 'Returns skewness of a sample.',
      syntax: 'SKEW(Number1, Number2, ...NumberN)',
    },
    {
      function: 'SKEW.P',
      description: 'Returns skewness of a population.',
      syntax: 'SKEW.P(Number1, Number2, ...NumberN)',
    },
    {
      function: 'SKEWP',
      description: 'Returns skewness of a population.',
      syntax: 'SKEWP(Number1, Number2, ...NumberN)',
    },
    {
      function: 'SLOPE',
      description: 'Returns the slope of a linear regression line.',
      syntax: 'SLOPE(Array1, Array2)',
    },
    {
      function: 'SMALL',
      description: 'Returns k-th smallest value in a range.',
      syntax: 'SMALL(Range, K)',
    },
    {
      function: 'STANDARDIZE',
      description: 'Returns normalized value with respect to expected value and standard deviation.',
      syntax: 'STANDARDIZE(X, Mean, Stddev)',
    },
    {
      function: 'STDEV',
      description: 'Returns standard deviation of a sample.',
      syntax: 'STDEV(Value1, Value2, ...ValueN)',
    },
    {
      function: 'STDEVA',
      description: 'Returns standard deviation of a sample.',
      syntax: 'STDEVA(Value1, Value2, ...ValueN)',
    },
    {
      function: 'STDEVP',
      description: 'Returns standard deviation of a population.',
      syntax: 'STDEVP(Value1, Value2, ...ValueN)',
    },
    {
      function: 'STDEV.P',
      description: 'Returns standard deviation of a population.',
      syntax: 'STDEV.P(Value1, Value2, ...ValueN)',
    },
    {
      function: 'STDEVPA',
      description: 'Returns standard deviation of a population.',
      syntax: 'STDEVPA(Value1, Value2, ...ValueN)',
    },
    {
      function: 'STDEV.S',
      description: 'Returns standard deviation of a sample.',
      syntax: 'STDEV.S(Value1, Value2, ...ValueN)',
    },
    {
      function: 'STDEVS',
      description: 'Returns standard deviation of a sample.',
      syntax: 'STDEVS(Value1, Value2, ...ValueN)',
    },
    {
      function: 'STEYX',
      description: 'Returns standard error for predicted of the predicted y value for each x value.',
      syntax: 'STEYX(Array1, Array2)',
    },
    {
      function: 'TDIST',
      description: 'Returns density of Student-t distribution, both-sided or right-tailed.',
      syntax: 'TDIST(X, Degrees, Mode)',
    },
    {
      function: 'T.DIST',
      description: 'Returns density of Student-t distribution.',
      syntax: 'T.DIST(X, Degrees, Mode)',
    },
    {
      function: 'T.DIST.2T',
      description: 'Returns density of Student-t distribution, both-sided.',
      syntax: 'T.DIST.2T(X, Degrees)',
    },
    {
      function: 'TDIST2T',
      description: 'Returns density of Student-t distribution, both-sided.',
      syntax: 'TDIST2T(X, Degrees)',
    },
    {
      function: 'T.DIST.RT',
      description: 'Returns density of Student-t distribution, right-tailed.',
      syntax: 'T.DIST.RT(X, Degrees)',
    },
    {
      function: 'TDISTRT',
      description: 'Returns density of Student-t distribution, right-tailed.',
      syntax: 'TDISTRT(X, Degrees)',
    },
    {
      function: 'TINV',
      description: 'Returns inverse Student-t distribution, both-sided.',
      syntax: 'TINV(P, Degrees)',
    },
    {
      function: 'T.INV',
      description: 'Returns inverse Student-t distribution.',
      syntax: 'T.INV(P, Degrees)',
    },
    {
      function: 'T.INV.2T',
      description: 'Returns inverse Student-t distribution, both-sided.',
      syntax: 'T.INV.2T(P, Degrees)',
    },
    {
      function: 'TINV2T',
      description: 'Returns inverse Student-t distribution, both-sided.',
      syntax: 'TINV2T(P, Degrees)',
    },
    {
      function: 'TTEST',
      description: 'Returns t-test value for a dataset.',
      syntax: 'TTEST(Array1, Array2)',
    },
    {
      function: 'T.TEST',
      description: 'Returns t-test value for a dataset.',
      syntax: 'T.TEST(Array1, Array2)',
    },
    {
      function: 'VAR',
      description: 'Returns variance of a sample.',
      syntax: 'VAR(Value1, Value2, ...ValueN)',
    },
    {
      function: 'VARA',
      description: 'Returns variance of a sample.',
      syntax: 'VARA(Value1, Value2, ...ValueN)',
    },
    {
      function: 'VARP',
      description: 'Returns variance of a population.',
      syntax: 'VARP(Value1, Value2, ...ValueN)',
    },
    {
      function: 'VAR.P',
      description: 'Returns variance of a population.',
      syntax: 'VAR.P(Value1, Value2, ...ValueN)',
    },
    {
      function: 'VARPA',
      description: 'Returns variance of a population.',
      syntax: 'VARPA(Value1, Value2, ...ValueN)',
    },
    {
      function: 'VAR.S',
      description: 'Returns variance of a sample.',
      syntax: 'VAR.S(Value1, Value2, ...ValueN)',
    },
    {
      function: 'VARS',
      description: 'Returns variance of a sample.',
      syntax: 'VARS(Value1, Value2, ...ValueN)',
    },
    {
      function: 'WEIBULL',
      description: 'Returns density of Weibull distribution.',
      syntax: 'WEIBULL(Number1, Number2, Number3, Boolean)',
    },
    {
      function: 'WEIBULL.DIST',
      description: 'Returns density of Weibull distribution.',
      syntax: 'WEIBULL.DIST(Number1, Number2, Number3, Boolean)',
    },
    {
      function: 'WEIBULLDIST',
      description: 'Returns density of Weibull distribution.',
      syntax: 'WEIBULLDIST(Number1, Number2, Number3, Boolean)',
    },
    {
      function: 'Z.TEST',
      description: 'Returns z-test value for a dataset.',
      syntax: 'Z.TEST(Array, X[, Sigma])',
    },
    {
      function: 'ZTEST',
      description: 'Returns z-test value for a dataset.',
      syntax: 'ZTEST(Array, X[, Sigma])',
    },
  ],
  Text: [
    {
      function: 'CHAR',
      description: 'Converts a number into a character according to the current code table.',
      syntax: 'CHAR(Number)',
    },
    {
      function: 'CLEAN',
      description: 'Returns text that has been "cleaned" of line breaks and other non-printable characters.',
      syntax: 'CLEAN("Text")',
    },
    {
      function: 'CODE',
      description: 'Returns a numeric code for the first character in a text string.',
      syntax: 'CODE("Text")',
    },
    {
      function: 'CONCATENATE',
      description: 'Combines several text strings into one string.',
      syntax: 'CONCATENATE("Text1", "Text2", ..."TextN")',
    },
    {
      function: 'EXACT',
      description: 'Returns TRUE if both text strings are exactly the same.',
      syntax: 'EXACT(Text, Text)',
    },
    {
      function: 'FIND',
      description: 'Returns the location of one text string inside another.',
      syntax: 'FIND( "Text1", "Text2"[, Number])',
    },
    {
      function: 'LEFT',
      description: 'Extracts a given number of characters from the left side of a text string.',
      syntax: 'LEFT("Text", Number)',
    },
    {
      function: 'LEN',
      description: 'Returns length of a given text.',
      syntax: 'LEN("Text")',
    },
    {
      function: 'LOWER',
      description: 'Returns text converted to lowercase.',
      syntax: 'LOWER(Text)',
    },
    {
      function: 'MID',
      description: 'Returns substring of a given length starting from Start_position.',
      syntax: 'MID(Text, Start_position, Length)',
    },
    {
      function: 'PROPER',
      description: 'Capitalizes words given text string.',
      syntax: 'PROPER("Text")',
    },
    {
      function: 'REPLACE',
      description: 'Replaces substring of a text of a given length that starts at given position.',
      syntax: 'REPLACE(Text, Start_position, Length, New_text)',
    },
    {
      function: 'REPT',
      description: 'Repeats text a given number of times.',
      syntax: 'REPT("Text", Number)',
    },
    {
      function: 'RIGHT',
      description: 'Extracts a given number of characters from the right side of a text string.',
      syntax: 'RIGHT("Text", Number)',
    },
    {
      function: 'SEARCH',
      description: 'Returns the location of Search_string inside Text. Case-insensitive. Allows the use of wildcards.',
      syntax: 'SEARCH(Search_string, Text[, Start_position])',
    },
    {
      function: 'SPLIT',
      description:
        'Divides the provided text using the space character as a separator and returns the substring at the zero-based position specified by the second argument.',
      syntax: 'SPLIT(Text, Index)',
    },
    {
      function: 'SUBSTITUTE',
      description:
        'Returns string where occurrences of Old_text are replaced by New_text. Replaces only specific occurrence if last parameter is provided.',
      syntax: 'SUBSTITUTE(Text, Old_text, New_text, [Occurrence])',
    },
    {
      function: 'T',
      description: 'Returns text if given value is text, empty string otherwise.',
      syntax: 'T(Value)',
    },
    {
      function: 'TEXT',
      description: 'Converts a number into text according to a given format.',
      syntax: 'TEXT(Number, Format)',
    },
    {
      function: 'TRIM',
      description: 'Strips extra spaces from text.',
      syntax: 'TRIM("Text")',
    },
    {
      function: 'UNICHAR',
      description: 'Returns the character created by using provided code point.',
      syntax: 'UNICHAR(Number)',
    },
    {
      function: 'UNICODE',
      description: 'Returns the Unicode code point of a first character of a text.',
      syntax: 'UNICODE(Text)',
    },
    {
      function: 'UPPER',
      description: 'Returns text converted to uppercase.',
      syntax: 'UPPER(Text)',
    },
  ],
};
