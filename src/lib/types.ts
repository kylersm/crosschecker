export interface TeacherScheduleEntry {
  School: string;
  Schoolname: string;
  "Course Code": string;
  "Course Name": string;
  Teacher: string;
  "Period 1": string;
  "Period 2": string;
  "Period 3": string;
  "Period 4": string;
  "Period 5": string;
  "Period 6": string;
  "Period 7": string;
  "Period 8": string;
  "Period 9": string;
  "Period 10": string;
  "Period 11": string;
  "Period 12": string;
  "Period 13": string;
  "Period 19": string;
  "Period 20": string;
  "Grand Total": string;
}

export type Period = keyof TeacherScheduleEntry & ("Period 1" |
"Period 2" |
"Period 3" |
"Period 4" |
"Period 5" |
"Period 6" |
"Period 7" |
"Period 8" |
"Period 9" |
"Period 10" |
"Period 11" |
"Period 12" |
"Period 13" |
"Period 19" |
"Period 20");

export interface TeacherClass {
  name: string;
  code: string;
  periods: number[];
}

export interface Teacher {
  name: string;
  classes: TeacherClass[];
}

export interface Student {
  name: string;
  ssid: string;
  schedule: StudentClass[];
}

interface StudentClass {
  name: string;
  teacher: string;
  code: string;
  period: number;
  enrollment: number;
}

/* new types? */

/* new type end */
export interface ExcludeStudents {
  code: string;
  teacher: string;
}

export interface QueryStudents extends ExcludeStudents {
  period: string;
}

export function compareExclude(a: ExcludeStudents, b: ExcludeStudents) {
  return a.code === b.code && a.teacher === b.teacher;
}

export function compareQuery(a: QueryStudents, b: QueryStudents) {
  return compareExclude(a, b) && a.period === b.period;
}

export interface StudentRosterEntry {
  stateID: string;
  Student: string;
  School: string;
  Schoolname: string;
  "Course Code": string;
  "Course Name": string;
  Semester: string;
  Term: string;
  Day: string;
  Period: string;
  Teacher: string;
}

export interface FinalSample {
  T_L_Name: string;
  T_F_Name: string;
  Period: string;
  Enrollment: string;
  ClassCode: string;
  CourseName: string;
}