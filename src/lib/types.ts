export interface Periods {
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
}
export interface CSVTeacherScheduleEntry extends Periods {
  School: string;
  Schoolname: string;
  "Course Code": string;
  "Course Name": string;
  Teacher: string;
  "Grand Total": string;
}

export interface TeacherClass {
  courseCode: string;
  courseName: string;
}

export interface ClassPeriod extends TeacherClass {
  teacher: string;
  periodNumber: keyof Periods;
  enrollment: number;
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

export interface QueryStudents {
  code: string;
  teacher: string;
  period: string;
}

export interface CSVStudentRosterEntry {
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