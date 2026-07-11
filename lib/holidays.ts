// Common US holidays, computed for any year — used to flag notable days on
// the Daily Tasks calendar widget without needing an external API.
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - offset);
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getHolidayForDate(date: Date): string | null {
  const year = date.getFullYear();
  const holidays: { name: string; date: Date }[] = [
    { name: "New Year's Day", date: new Date(year, 0, 1) },
    { name: "Martin Luther King Jr. Day", date: nthWeekdayOfMonth(year, 0, 1, 3) },
    { name: "Valentine's Day", date: new Date(year, 1, 14) },
    { name: "Presidents' Day", date: nthWeekdayOfMonth(year, 1, 1, 3) },
    { name: "St. Patrick's Day", date: new Date(year, 2, 17) },
    { name: "Memorial Day", date: lastWeekdayOfMonth(year, 4, 1) },
    { name: "Juneteenth", date: new Date(year, 5, 19) },
    { name: "Independence Day", date: new Date(year, 6, 4) },
    { name: "Labor Day", date: nthWeekdayOfMonth(year, 8, 1, 1) },
    { name: "Halloween", date: new Date(year, 9, 31) },
    { name: "Veterans Day", date: new Date(year, 10, 11) },
    { name: "Thanksgiving", date: nthWeekdayOfMonth(year, 10, 4, 4) },
    { name: "Christmas Eve", date: new Date(year, 11, 24) },
    { name: "Christmas Day", date: new Date(year, 11, 25) },
    { name: "New Year's Eve", date: new Date(year, 11, 31) },
  ];
  const match = holidays.find((h) => isSameDate(h.date, date));
  return match ? match.name : null;
}
