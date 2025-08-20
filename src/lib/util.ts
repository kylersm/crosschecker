import { Periods, TeacherClass } from "./types";

export const splitInput = (string: string, separator: string) => string.split(separator).filter(s => s.length);
export const isMerging = (classes: TeacherClass[], period: number, thisClass: TeacherClass) => classes.some(c2 => c2.periods[period] > 0 && c2.code !== thisClass.code);
export const isLastClass = (classes: TeacherClass[], classPos: number, period: number) => classes.every((c2, k) => classPos >= k || c2.periods[period] === 0);

export type Period = keyof Periods;
export const periodKeys: Period[] = [
  "Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6", "Period 7", "Period 8", "Period 9", "Period 10", "Period 11", "Period 12", "Period 13", "Period 19", "Period 20"
];

export function getPeriodIndex(periodNum: string) {
  return periodKeys.indexOf("Period " + periodNum as Period);
}

export enum CourseStatus {
  ENGLEARNER="bg-[rgb(237,206,204)]",
  SPECIALED="bg-[rgb(247,230,206)]",
  ALTERNATIVE="bg-[rgb(252,243,205)]",
  WORKSHOP="bg-[rgb(220,233,211)]",
  VIRTUAL="bg-[rgb(212,225,243)]",
  ASSESSMENT="bg-[rgb(216,210,233)]",
  NONCREDIT="bg-[rgb(240,205,158)]",
  HONORS="text-pink-400 font-semibold",
};

export function getStatus(code: string, name: string) {
  const modifiers = code.slice(-3);
  const lowerName = name.toLowerCase();
  if (code.startsWith("NEI") || modifiers.includes("J"))
    return CourseStatus.ENGLEARNER;
  else if (modifiers.includes("S"))
    return CourseStatus.SPECIALED;
  else if (modifiers.includes("U"))
    return CourseStatus.ALTERNATIVE;
  else if (code.startsWith("XAG") || code.startsWith("XW") || code.startsWith("XZ"))
    return CourseStatus.NONCREDIT;
  else if (/wo?r?k-?sho?p/i.test(name) || modifiers.includes("ALC") || modifiers.includes("CBI") || modifiers.includes("W") || modifiers.includes("R"))
    return CourseStatus.WORKSHOP;
  else if (modifiers.includes("V") && modifiers !== "AVD" && !code.endsWith("AVID"))
    return CourseStatus.VIRTUAL;
  else if (code.startsWith("NSA") || code.startsWith("NSC"))
    return CourseStatus.ASSESSMENT;
  else if (lowerName.startsWith("ap ") || lowerName.startsWith("advanced placement") || (modifiers.endsWith("H") && modifiers !== "HTH") || modifiers.endsWith("G"))
    return CourseStatus.HONORS;
}
