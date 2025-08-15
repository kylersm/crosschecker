import { CourseStatus } from "@/app/page";
import { TeacherClass } from "./types";

export const splitInput = (string: string, separator: string) => string.split(separator).filter(s => s.length);
export const isMerging = (classes: TeacherClass[], period: number, thisClass: TeacherClass) => classes.some(c2 => c2.periods[period] > 0 && c2.code !== thisClass.code);
export const isLastClass = (classes: TeacherClass[], classPos: number, period: number) => classes.every((c2, k) => classPos >= k || c2.periods[period] === 0);
export function GetStatus(code: string, name: string) {
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
