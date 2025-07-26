"use client";

import ReactDOMServer from "react-dom/server";
import csv from "papaparse";
import { Dispatch, PropsWithChildren, SetStateAction, useMemo, useState } from "react";

interface TeacherScheduleEntry {
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

const periodKeys: (keyof TeacherScheduleEntry)[] = [
  "Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6", "Period 7", "Period 8", "Period 9", "Period 10", "Period 11", "Period 12", "Period 13", "Period 19", "Period 20"
];

interface TeacherClass {
  name: string;
  code: string;
  periods: number[];
}

interface Teacher {
  name: string;
  classes: TeacherClass[];
}

interface Student {
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

interface QueryStudents {
  code: string;
  teacher: string;
  period: string;
}

interface StudentRosterEntry {
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

interface FinalSample {
  TL_Name: string;
  TF_Name: string;
  Period: string;
  Enrollment: string;
  ClassCode: string;
  CourseName: string;
}

const discriminator = 'あ';

export default function Home() {
  const [teacherSched, setTS] = useState<string>();
  const [stdtnRost, setSR] = useState<string>();

  // parse input in textareas
  const parsedTS = teacherSched ? csv.parse<TeacherScheduleEntry>(teacherSched, {
    delimiter: '\t',
    header: true
  }) : void 0;

  const parsedSR = stdtnRost ? csv.parse<StudentRosterEntry>(stdtnRost, {
    delimiter: '\t',
    header: true
  }) : void 0;

  // log any errors if needed
  const parseErrors = useMemo<string[]>(() => {
    const errors = [];
    // make sure they didn't paste it in the wrong area
    if(Object.keys(parsedTS?.data[0] ?? {}).length === 11 || Object.keys(parsedSR?.data[0] ?? {}).length === 21)
      errors.push("You pasted the teacher schedules and student rosters in the wrong areas (swap them)");
    if(parsedTS?.errors.length)
      errors.push(...parsedTS.errors.map(e => `Teacher Schedule:\t${e.type} (${e.code}): ${e.message} @ ${e.index ? 'Index ' + e.index : ''} ${e.row ? 'Row ' + e.row : ''}`));
    if(parsedSR?.errors.length)
      errors.push(...parsedSR.errors.map(e => `Student Roster:\t${e.type} (${e.code}): ${e.message} @ ${e.index ? 'Index ' + e.index : ''} ${e.row ? 'Row ' + e.row : ''}`));
    return errors;
  }, [parsedTS, parsedSR]);

  // go through parsed teacher TSV
  const teachers: Teacher[] = [];
  if(parsedTS && !parseErrors.length) {
    // sort alphabetically
    for(const clazz of parsedTS.data.sort((a, b) => a.Teacher.localeCompare(b.Teacher))) {
      // find teacher entry, or create one if it doesn't exist & add it to teachers list
      let entry = teachers.find(t => t.name === clazz.Teacher);
      if(!entry) {
        entry = { name: clazz.Teacher, classes: [] };
        teachers.push(entry);
      }
      // add the class to teacher's classes
      entry.classes.push({
        code: clazz["Course Code"],
        name: clazz["Course Name"],
        periods: periodKeys.map(p => parseInt(clazz[p]))
      });
    }
  }

  const [ccPre, setCCP] = useState<string>(''); // Course Code PREfix
  const [ccSuf, setCCS] = useState<string>(''); // Course Code SUFfix
  const [cnInc, setCNI] = useState<string>(''); // Course Name INCludes
  const [cPIs, setCPIS] = useState<string>(''); // Course Period is...
  const [doeEn, setDEN] = useState<number>(0);
  const periodIndex = periodKeys.indexOf(("Period " + cPIs) as keyof TeacherScheduleEntry);

  const [disableApHighlight, setDAH] = useState<boolean>(false);
  const [cdcNums, setCDCN] = useState<string>('');

  // const [manualInclude, setMI] = useState<[string, string][]>([]);

  const [query, setQuery] = useState<QueryStudents>();

  const teachersWithFilters = teachers
    // first filter teacher classes that begin and end with given phrases, OR include if name includes phrase and (if period school), period matches input
    .map(t => ({ ...t, classes: t.classes.filter(c => (!ccPre.length && !ccSuf.length && !cnInc.length && periodIndex < 0) ||
      ((ccPre.length || ccSuf.length) && c.code.startsWith(ccPre.toUpperCase()) && c.code.endsWith(ccSuf.toUpperCase())) || 
      ((periodIndex >= 0 || cnInc.length) && c.name.includes(cnInc.toUpperCase()) && (periodIndex < 0 || c.periods[periodIndex] > 0))
    ).map(c => ({...c, periods: periodIndex < 0 ? c.periods : c.periods.map((e, i) => i === periodIndex ? e : 0)}))}))
    // then remove teachers that aren't teaching any classes that meet criteria
    .filter(t => t.classes.length);

  // get list of unused periods based on filtered teachers (so we can hide columns that we aren't using)
  const unusedPeriods = periodKeys.filter((_, i) => periodIndex > -1 ? i !== periodIndex : teachersWithFilters.every(t => t.classes.every(c => c.periods[i] === 0)));

  // now do something similar for students
  const students: Student[] = [];
  // used to get a list of students and their schedules for a specific class
  if(query && parsedSR) {
    // get a list of SSIDs of students in the class we are looking for
    const ssidsInClass = parsedSR.data.filter(student => query.code === student["Course Code"] && query.period === student.Period && query.teacher === student.Teacher).map(s => s.stateID);
    // then (sort students alphabetically) using the SSIDs, get each students' schedules.
    for(const student of parsedSR.data.sort((a, b) => a.Student.localeCompare(b.Student))) {
      // ignore if not in list
      if(!ssidsInClass.includes(student.stateID)) continue;
      // find or create entry for list
      let entry = students.find(t => t.ssid === student.stateID);
      if(!entry) {
        entry = { name: student.Student, schedule: [], ssid: student.stateID };
        students.push(entry);
      }
      // add class to the student's schedule
      entry.schedule.push({
        code: student["Course Code"],
        name: student["Course Name"],
        teacher: student.Teacher,
        period: parseInt(student.Period),
        enrollment: teachers.find(t => t.name === student.Teacher)?.classes.find(c => c.code === student["Course Code"])?.periods[periodKeys.indexOf(("Period " + student.Period) as keyof TeacherScheduleEntry)] ?? -1
      });
    }
    // then sort each student's roster by period (for housekeeping)
    for(const student of students)
      student.schedule = student.schedule.sort((a, b) => a.period - b.period);
  }

  // list of classes to exclude from sample
  const [excludeCourses, setECourse] = useState<string[]>([]);
  // type: [COURSE CODE]-[Teacher Name]

  const [includeClasses, setIClass] = useState<string[]>([]);
  // type: [COURSE CODE]-[Teacher Name]-[period]

  const allClasses = teachersWithFilters.flatMap(t => t.classes.flatMap((c) => c.periods.flatMap((p,i) => p === 0 ? '' : (c.code + discriminator + t.name + discriminator + periodKeys[i].slice("Period ".length))).filter(c => c.length)));
  const filteredEnrollment = teachersWithFilters.flatMap(t => t.classes.flatMap(c => c.periods)).reduce((p, c) => p + c, 0);
  const classCodeObj = useMemo<Record<string,number>>(() => {
    const o: Record<string,number> = {};
    let count = 1;
    teachersWithFilters.forEach(t => {
      t.classes.forEach((c, i) => {
        c.periods.forEach((p, j) => {
          const code = c.code + discriminator + t.name + discriminator + periodKeys[j].slice("Period ".length);
          // ignore if enrollment is 0
          if(p === 0) return;
          // ignore if entire course is exclude-checked
          if(excludeCourses.some(e => code.startsWith(e))) return;
          // ignore if course was not checked
          if(!includeClasses.includes(code)) return;

          // if we should merge the class - apply the same course code across multiple courses occurring during the same period
          const shouldMerge = isMerging(t.classes, j, c);
          // should be an if-else but made so it fallbacks to default behavior if no other classes to merge with were found
          // regular behavior: adds course to list, increments count
          if(shouldMerge) {
            // if the user clicks on the 'select all' box, it causes classes you wouldn't normally be able to select to get selected.
            // this checks to see if we're working with the course that appears first that is non-empty.
            const isFirst = t.classes.every((c2, i2) => i <= i2 || c2.periods[j] === 0);
            if(!isFirst) return;
            const pdClasses: string[] = [];
            // add all non-empty courses to the list
            for(let i2 = 0; i2 < t.classes.length; i2++) {
              const cl = t.classes[i2];
              if(!cl || cl.periods[j] === 0) continue;
              const thisCode = cl.code + discriminator + t.name + discriminator + periodKeys[j].slice("Period ".length);
              if(excludeCourses.some(e => thisCode.startsWith(e))) return;
              pdClasses.push(thisCode);
            }
            // adds all courses to list using first count, then increment
            if(pdClasses.length) {
              o[code] = count;
              for(const pdCl of pdClasses) {
                o[pdCl] = count;
              }
              count++;
              return;
            }
          }

          o[code] = count++;
        });
      });
    });
    return o;
  }, [excludeCourses, includeClasses, teachersWithFilters]);

  // generate the text to be pasted into the spreadsheet
  const unparse = useMemo<FinalSample[]>(() => {
    const arr: FinalSample[] = Object.entries(classCodeObj).map(([key, code]) => {
      // get information from the key
      const destructKey = key.split(discriminator) as [string, string, string];
      const courseCode = destructKey[0];
      const teacher = destructKey[1].split(', ') as [string, string];
      const period = destructKey[2];
      const classEntry = teachersWithFilters.find(t => t.name === destructKey[1])?.classes.find(c => c.code === courseCode);
      const periodIndex = periodKeys.indexOf(("Period " + period) as keyof TeacherScheduleEntry);

      return {
        TL_Name: teacher[0],
        TF_Name: teacher[1],
        Period: period,
        Enrollment: classEntry?.periods[periodIndex].toString() ?? '-1',
        ClassCode: code.toString(),
        CourseName: classEntry?.name ?? "Not found"
      }
    })
    
    return arr.sort((a, b) => a.TL_Name.localeCompare(b.TL_Name));
  }, [classCodeObj, teachersWithFilters]);

  const goToSelected = () => {
    const y = (document.getElementById("queried")?.getBoundingClientRect().top ?? 0) + window.scrollY - 35;
    window.scrollTo({ top: y, behavior: "smooth"});
  };

  return (
    <div className="w-full h-screen">
      <div className="mx-2 my-5 pb-10">
        {/* Paste-in fields (2) */}
        <p className="text-6xl font-bold text-center">Sampler Site</p>
        <div className="flex gap-x-10 mx-20 mb-10">
          <div className="w-1/2 text-center">
            <Textarea setter={setTS}>
              Teacher Schedules
            </Textarea>
          </div>
          <div className="w-1/2 text-center">
            <Textarea setter={setSR}>
              Student Rosters
            </Textarea>
          </div>
        </div>

        {!!teacherSched!==!!stdtnRost ? <div className="text-center">Please fill in all the information</div> : ''}
        {parseErrors.length ? <div className="w-full flex">
          <div className="mx-auto">
            <p className="text-red-500 font-semibold">ERROR PARSING:</p>
            <ul>
              {parseErrors.map(x => <li key={"parse-error" + x}>{x}</li>)}
            </ul>
          </div>
        </div> : parsedSR && parsedTS ? <div>
          <div>
            {/* Filter options after pasting data in */}
            <table className="mx-auto">
              <tbody>
                <tr>
                  <td>Course code begins with...</td>
                  <td><input onChange={e => setCCP(e.target.value)} type="text" className="bg-white rounded-md text-black px-2"/></td>
                  <td>Disable <span className="bg-white text-red-500 font-semibold">appears in other class</span> Highlighting</td>
                  <td><input onChange={e => setDAH(e.target.checked)} type="checkbox"/></td>
                </tr>
                <tr>
                  <td>Course code ends with...</td>
                  <td><input onChange={e => setCCS(e.target.value)} type="text" className="bg-white rounded-md text-black px-2"/></td>
                  <td>Select all classes (on screen) for sample</td>
                  <td><input onClick={() => {setECourse([]);setIClass(allClasses);}} className="bg-white text-black rounded-md px-2 border-black" type="button" value={"Click me!"}/></td>
                </tr>
                <tr>
                  <td><b>OR...</b> Course name contains...</td>
                  <td><input onChange={e => setCNI(e.target.value)} type="text" className="bg-white rounded-md text-black px-2"/></td>
                  <td>Unselect all classes for sample</td>
                  <td><input onClick={() => {setECourse([]);setIClass([]);}} className="bg-white text-black rounded-md px-2 border-black" type="button" value={"Click me!"}/></td>
                </tr>
                <tr>
                  <td>Period must be...</td>
                  <td><input onChange={e => setCPIS(e.target.value)} type="text" className="bg-white rounded-md text-black px-2"/></td>
                  <td>DOE Enrollment</td>
                  <td><input onChange={e => setDEN(parseInt(e.target.value))} type="number" min={1} className="bg-white rounded-md text-black px-2"/></td>
                </tr>
                <tr>
                  <td>CDC Random Numbers</td>
                  <td colSpan={3}><input onChange={e => setCDCN(e.target.value)} type="text" className="w-full bg-white rounded-md text-black px-2"/></td>
                </tr>
              </tbody>
            </table>
            <div className="mx-auto w-full text-center text-2xl">
              <b>RANGE: </b> {(filteredEnrollment / doeEn).toPrecision(3)}%<br/>
              {Math.abs(1 - (filteredEnrollment / doeEn)) > 0.15 ? <p className="text-red-500 font-bold">Out of 15% range</p> : <p className="text-green-500 font-bold text-lg">In 15% range</p>}
            </div>
            <div className="flex gap-x-5 px-1">
              {/* LEFT SIDE */}
              <div className="w-full">
                {/* TEACHER OVERVIEW */}
                <p className="text-center text-4xl font-semibold">Teacher Overview</p>
                <table className="mx-auto mb-5 text-sm info w-full">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-500">
                      <th>Teacher</th>
                      <th>Course Code</th>
                      <th>Name</th>
                      {/* Add a table header for each period */}
                      {periodKeys.filter(x => !unusedPeriods.includes(x)).map(x => <th key={"to"+x}>{x.slice("Period ".length)}</th>)}
                    </tr>
                  </thead>
                  <tbody className="border-2">
                    {/* Add a row for each teacher and their class(es) */}
                    {teachersWithFilters.map(t => t.classes.map((c, i, classes) => {
                      const status = GetStatus(c.code, c.name);
                      const thisCourse = c.code+discriminator+t.name;
                      const excludedClasses = excludeCourses.includes(thisCourse) ? 'italic line-through text-gray-400' : '';
                      const classname = status ? status + " text-black" : '';
                      return <>
                        <tr key={"teachertable" + c.code + '-' + t.name} className={classes.length - 1 === i ? "border-b-2 border-b-slate-400" : ""}>
                          { /* add teacher name row only for first row since we do a row span */ }
                          {i == 0 ? <td rowSpan={2 * t.classes.length - t.classes.filter(c => excludeCourses.includes(c.code + discriminator + t.name)).length} className="text-center">{t.name}</td> : <></>}
                      
                          { /* show course code and name, then show exclude checkbox next to name */ }
                          <td rowSpan={excludedClasses.length ? 1 : 2} className={classname + ' ' + excludedClasses}>{c.code}</td>
                          { /* show course name and exclusion checkbox */ }
                          <td rowSpan={excludedClasses.length ? 1 : 2} className={classname + ' ' + excludedClasses}>
                            <div className="flex w-full gap-x-1">
                              {c.name} <input title="Click to exclude entire course from sample" className="ml-auto accent-red-500" type="checkbox" onChange={(e) =>
                                setECourse(
                                  e.target.checked ? 
                                    excludeCourses.concat(thisCourse) :
                                    excludeCourses.filter(c => c !== thisCourse)
                                )}/>
                            </div>  
                          </td>
                          { /* map out periods */ }
                          {c.periods.map((p,j) => {
                            const isMergingClass = isMerging(classes, j, c);
                            const isLast = isLastClass(classes, i, j);
                            const isSelectedForQuery = query?.code === c.code && query.period === periodKeys[j].slice("Period ".length) && query.teacher === t.name;
                            const num = classCodeObj[c.code + discriminator + t.name + discriminator + periodKeys[j].slice("Period ".length)] ?? -1;
                            let code: string | undefined = undefined;
                            /**
                              * Check if the class should be merged, that is the same teacher is teaching difference classes in the same period.
                              * - if so, the course code assigned to the checkbox will actually be for the 'topmost' class on the grid
                              * - all other checkboxes are hidden
                              * - the checkbox 'selects' all the other classes
                              */
                            if(isMergingClass) {
                              // get the first (topmost) class
                              for(let i2 = 0; i < classes.length || !code; i2++) {
                                const cl = t.classes[i2];
                                if(!cl || cl.periods[j] === 0) continue;
                                code = cl.code;
                                break;
                              }
                            }
                            if(!code)
                              code = c.code;
                            // hide row if period is unused
                            // show table data and highlight as amber if we are looking at student info
                            return unusedPeriods.includes(periodKeys[j]) ? <></> : <td
                              key={t.name + '-' + c.code + '-' + j}
                              rowSpan={excludedClasses.length ? 1 : p === 0 || num < 0 ? 2 : 1}
                              id={isSelectedForQuery ? 'queried' : ''}
                              className={
                                'font-normal! ' + 
                                (isSelectedForQuery ? "bg-amber-300 text-black" : `${classname.includes("bg-") ? 'text-blue-600' : 'text-blue-400!'} ${classname}`)}
                            >
                              { /* if period enrollment is 0 show nothing, otherwise show enrollment and checkbox to include class */ }
                              {p === 0 ? '' : <div className="flex w-full gap-x-1">
                                <span className={`underline cursor-pointer`} 
                                // onclick will set our 'query' to look at students for this class
                                onClick={() => setQuery({
                                code: c.code,
                                period: periodKeys[j].slice("Period ".length),
                                teacher: t.name
                              })}>{p}</span> <input 
                                className={`${isMergingClass && !isLast ? 'hidden' : ''} ml-auto accent-green-400`}
                                type="checkbox" 
                                // disable IF whole course was excluded (tickbox checked)
                                disabled={excludeCourses.includes(c.code+discriminator+t.name)}
                                checked={includeClasses.includes(code + discriminator + t.name + discriminator + periodKeys[j].slice("Period ".length))}
                                onChange={(e) => {
                                  const thisClass = code + discriminator + t.name + discriminator + periodKeys[j].slice("Period ".length);
                                  setIClass(
                                    e.target.checked ? 
                                      includeClasses.concat(thisClass) :
                                      includeClasses.filter(c => c !== thisClass)
                                  );
                                }}
                              />
                              </div>}
                            </td>
                          ;})}
                        </tr>

                        
                        {!excludedClasses.length ? <tr key={"teachertablepreview" + c.code + '-' + t.name}>
                          {c.periods.map((p,i) => {
                            const includePeriod = includeClasses.includes(c.code + discriminator + t.name + discriminator + (periodKeys[i].slice("Period ".length)));
                            const doNotInclude = p === 0 || !includePeriod;
                            const num = classCodeObj[c.code + discriminator + t.name + discriminator + periodKeys[i].slice("Period ".length)] ?? -1;
                            const selected = !doNotInclude && cdcNums.split(',').map(c => parseInt(c)).includes(num);
                            if(!unusedPeriods.includes(periodKeys[i])) return num > 0 ? <td 
                              key={"previewtableNUM" + c.code + '-' + t.name + '-' + periodKeys[i]}
                              className={`text-center font-normal! h-max ${selected ? 'bg-green-100' : classname} text-red-500`}
                            >
                              {num}
                            </td> : <></>;
                          })}
                        </tr> : <></>}
                      </>
                    }))}
                  </tbody>
                </table>
                {/* STUDENT OVERVIEW */}
                {query ? <>
                  <p className="text-center text-4xl font-semibold" id="student-overview">Student Overview</p>
                  <div className="text-center">Looking at {query.teacher} period {query.period} ({query.code})</div>
                  <table className="mx-auto mb-5 info w-full">
                    <tbody>
                      <tr className="bg-slate-500">
                        <th>SSID</th>
                        <th>Student</th>
                        <th>Course Code</th>
                        <th>Course Name</th>
                        <th>Teacher</th>
                        <th>Pd</th>
                        <th>En</th>
                      </tr>
                      {students.map(s => s.schedule.map((c, i) => {
                      const isThisClass = query?.code === c.code && query.period === c.period.toString() && query.teacher === c.teacher;
                      const status = isThisClass ? 'bg-amber-300' : GetStatus(c.code, c.name);
                      const appearsInOther = !disableApHighlight && periodIndex < 0 && teachersWithFilters.some(t => 
                        t.classes.some(c2 => 
                          // c2.code !== query.code && t.name !== query.teacher &&
                          !isThisClass && c2.code === c.code && t.name === c.teacher
                        )
                      );
                      const classname = appearsInOther ? "bg-white text-red-500 font-semibold" : (status ? status + " text-black" : '');
                      return <tr key={"studenttable" + c.code + '-' + s.name + '-' + c.period + '-' + c.teacher} title={
                          appearsInOther ? "Student appears in another class in the classes you filtered for." :
                          isThisClass ? "This is the class you clicked on in filters." : ''
                        }>
                        {i == 0 ? <td rowSpan={s.schedule.length} className="text-center">{s.ssid}</td> : <></>}
                        {i == 0 ? <td rowSpan={s.schedule.length} className="text-center">{s.name}</td> : <></>}
                        <td className={classname}>{c.code}</td>
                        <td className={classname}>{c.name}</td>
                        <td className={classname}>{c.teacher}</td>
                        <td className={classname + " text-center"}>{c.period}</td>
                        <td className={classname + " text-center"}>{c.enrollment}</td>
                      </tr>;
                    }))}
                    </tbody>
                  </table>
                </> : ''}
              </div>
              {/* RIGHT SIDE */}
              <div className="w-fit max-w-[10rem] sticky top-0 self-start">
                <p className="text-center text-3xl font-semibold">Color Key</p>
                <table className="mx-auto mb-5 info text-sm mt-1">
                  <tbody>
                    <tr><td>Regular class</td></tr>
                    <tr><td className={CourseStatus.HONORS}>Honors / AP</td></tr>
                    <tr><td className={CourseStatus.SPECIALED + " text-black"}>Special Education</td></tr>
                    <tr><td className={CourseStatus.ENGLEARNER + " text-black"}>English Language Learner</td></tr>
                    <tr><td className={CourseStatus.ALTERNATIVE + " text-black"}>Alternative</td></tr>
                    <tr><td className={CourseStatus.WORKSHOP + " text-black"}>Workshop</td></tr>
                    <tr><td className={CourseStatus.VIRTUAL + " text-black"}>Virtual</td></tr>
                    <tr><td className={CourseStatus.ASSESSMENT + " text-black"}>CC Alt Assessment</td></tr>
                    <tr><td className={CourseStatus.NONCREDIT + " text-black"}>Noncredit</td></tr>
                  </tbody>
                </table>
                <div className="flex w-full">
                  {query ? <div className="w-fit mx-auto">
                    <div className="mx-auto">
                      <b>Selected class</b><br/>
                      {query.teacher} PD {query.period}<br/>
                      Course {query.code}<br/>
                    </div>
                    <Button onClick={goToSelected} className="bg-red-200">
                      <div className="flex items-center">
                        <p className="text-xl font-bold -ml-2 mr-2">↑</p>
                        <p>Scroll to teacher schedules</p>
                      </div>
                    </Button>
                    <Button onClick={() => 
                      document.getElementById("student-overview")?.scrollIntoView({ behavior: "smooth" })
                    } className="bg-amber-200">
                      <div className="flex items-center">
                      <p className="text-xl font-bold -ml-2 mr-1">↓</p>
                      <p>Scroll to student overview</p>
                      </div>
                    </Button>

                    <br className="h-10"/>
                    <i>See student overview before clicking</i>
                    <Button onClick={() => {
                        const thisClass = query.code + discriminator + query.teacher + discriminator + query.period;
                        if(includeClasses.includes(thisClass))
                          setIClass(includeClasses.filter(i => i !== thisClass));
                        goToSelected();
                    }} className="bg-red-400">
                      Exclude Class
                    </Button>
                    <Button onClick={() => {
                        const thisClass = query.code + discriminator + query.teacher + discriminator + query.period;
                        if(!includeClasses.includes(thisClass))
                          setIClass(includeClasses.concat(thisClass));
                        goToSelected();
                    }} className="bg-green-400">
                      Include Class
                    </Button>
                  </div> : <i className="mx-auto">No selected class</i>}
                </div>
              </div>
            </div>
          </div>
          <pre>{csv.unparse(unparse)}</pre>
        </div> : <></>}
        <pre>
        </pre>
      </div>
    </div>
  );
}

enum CourseStatus {
  ENGLEARNER="bg-[rgb(237,206,204)]",
  SPECIALED="bg-[rgb(247,230,206)]",
  ALTERNATIVE="bg-[rgb(252,243,205)]",
  WORKSHOP="bg-[rgb(220,233,211)]",
  VIRTUAL="bg-[rgb(212,225,243)]",
  ASSESSMENT="bg-[rgb(216,210,233)]",
  NONCREDIT="bg-[rgb(240,205,158)]",
  HONORS="text-pink-400 font-semibold",
};

const isMerging = (classes: TeacherClass[], period: number, thisClass: TeacherClass) => classes.some(c2 => c2.periods[period] > 0 && c2.code !== thisClass.code);
const isLastClass = (classes: TeacherClass[], classPos: number, period: number) => classes.every((c2,k) => classPos >= k || c2.periods[period] === 0);

function GetStatus(code: string, name: string) {
  const modifiers = code.slice(-3);
  const lowerName = name.toLowerCase();
  if(code.startsWith("NEI") || modifiers.includes("J"))
    return CourseStatus.ENGLEARNER;
  else if(modifiers.includes("S"))
    return CourseStatus.SPECIALED;
  else if(modifiers.includes("U"))
    return CourseStatus.ALTERNATIVE;
  else if(code.startsWith("XAG") || code.startsWith("XW") || code.startsWith("XZ"))
    return CourseStatus.NONCREDIT;
  else if(/wo?r?k-?sho?p/i.test(name) || modifiers.includes("ALC") || modifiers.includes("CBI") || modifiers.includes("W") || modifiers.includes("R"))
    return CourseStatus.WORKSHOP;
  else if(modifiers.includes("V"))
    return CourseStatus.VIRTUAL;
  else if(code.startsWith("NSA") || code.startsWith("NSC"))
    return CourseStatus.ASSESSMENT;
  else if(lowerName.startsWith("ap") || lowerName.startsWith("advanced placement") || modifiers.endsWith("H") || modifiers.endsWith("G"))
    return CourseStatus.HONORS;
}

function Button(props: { onClick: () => void; className: string; } & React.PropsWithChildren) {
  return <div className={props.className + ' text-center font-semibold rounded-xl px-3 py-1 my-3 text-black'} onClick={props.onClick}>
    {props.children}
  </div>;
}

function Textarea(props: { setter: Dispatch<SetStateAction<string | undefined>>} & PropsWithChildren) {
  return <>
    <p>{props.children}</p>
    <textarea 
      onChange={e => props.setter(e.target.value)} 
      className="h-40 resize-none bg-gray-100 text-black w-full rounded-md px-2 py-1 shadow-inner shadow-black"
      placeholder={"Paste " + ReactDOMServer.renderToString(props.children).toLowerCase() + " from Google sheets here"}
    />
  </>;
}