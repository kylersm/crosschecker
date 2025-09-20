"use client";

import csv from "papaparse";
import { Fragment, useMemo, useState } from "react";
import { discriminator, Period, periodKeys, QueryStudents, Student, StudentRosterEntry, Teacher, TeacherScheduleEntry } from "@/lib/types";
import { Textarea } from "@/components/Textarea";
import { isMerging, GetStatus, isLastClass, splitInput } from "@/lib/util";
import ColorCodes from "@/components/ColorCodes";
import BottomBar from "@/components/BottomBar";

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
      errors.push("You pasted the teacher schedules and student rosters in the wrong areas");
    if(parsedTS?.data[0] && Object.keys(parsedTS.data[0]).length !== 21 ||parsedSR?.data[0] &&  Object.keys(parsedSR.data[0]).length !== 11)
      errors.push("Teacher or student roster has an invalid amount of columns.");
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
  // const periodIndex = periodKeys.indexOf(("Period " + cPIs) as keyof TeacherScheduleEntry);

  const [disableApHighlight, setDAH] = useState<boolean>(false);
  const [cdcNums, setCDCN] = useState<string>('');
  const numsSplit = cdcNums.split(',').map(x => parseInt(x));

  const [query, setQuery] = useState<QueryStudents[]>();


  const inputSeparator = ';';
  const prefixes = splitInput(ccPre, inputSeparator);
  const suffixes = splitInput(ccSuf, inputSeparator);
  const includes = splitInput(cnInc, inputSeparator);
  const periods  = splitInput(cPIs, inputSeparator)
                    .map(k => periodKeys.indexOf(("Period " + k) as Period))
                    .filter(k => k > -1);

  const teachersWithFilters:Teacher[] = teachers
    // first filter teacher classes that begin and end with given phrases, OR include if name includes phrase and (if period school), period matches input
    .map(t => ({ ...t, classes: t.classes.filter(c => {
      if(prefixes.length || suffixes.length || includes.length || periods.length) {

        if(prefixes.length || suffixes.length)
          if (
            prefixes.some(p => c.code.toUpperCase().startsWith(p.toUpperCase())) ||
            suffixes.some(s => c.code.toUpperCase().endsWith(s.toUpperCase()))
          )
            return true;
        if(periods.length || includes.length)
          if (
            periods.some(index => c.periods[index] > 0) ||
            includes.some(i => c.name.toUpperCase().includes(i.toUpperCase()))
          )
            return true;

        return false;
      } else return true;
    }).map(c => ({...c, periods: !periods.length ? c.periods : c.periods.map((e, i) => periods.includes(i) ? e : 0)}))}))
    // then remove teachers that aren't teaching any classes that meet criteria
    .filter(t => t.classes.length);

  // get list of unused periods based on filtered teachers (so we can hide columns that we aren't using)
  const unusedPeriods = periodKeys.filter((_, i) => periods.length ? !periods.includes(i) : teachersWithFilters.every(t => t.classes.every(c => c.periods[i] === 0)));
  const periodSchool = periodKeys.length - unusedPeriods.length === 1;

  // now do something similar for students
  const students: Student[] = [];
  // used to get a list of students and their schedules for a specific class
  if(query && parsedSR) {
    // get a list of SSIDs of students in the class we are looking for
    const ssidsInClass = parsedSR.data.filter(student => query.some(q => q.code === student["Course Code"] && q.period === student.Period && q.teacher === student.Teacher)).map(s => s.stateID);
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
        enrollment: teachers.find(t => t.name === student.Teacher)?.classes.find(c => c.code === student["Course Code"])?.periods[periodKeys.indexOf(("Period " + student.Period) as Period)] ?? -1
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
            const isFirst = t.classes.every((c2, i2) => i <= i2 || c2.periods[j] === 0 || excludeCourses.includes(c2.code + discriminator + t.name));
            if(!isFirst) return;
            const pdClasses: string[] = [];
            // add all non-empty courses to the list
            for(let i2 = 0; i2 < t.classes.length; i2++) {
              const cl = t.classes[i2];
              if(!cl || cl.periods[j] === 0 || excludeCourses.includes(cl.code + discriminator + t.name)) continue;
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
                  <td><input onChange={e => setCCP(e.target.value)} type="text" className="bg-slate-200 dark:bg-white rounded-md text-black px-2"/></td>
                  <td>Disable <span className="bg-yellow-300 dark:bg-white text-red-500 font-semibold">appears in other class</span> Highlighting</td>
                  <td><input onChange={e => setDAH(e.target.checked)} type="checkbox"/></td>
                </tr>
                <tr>
                  <td>Course code ends with...</td>
                  <td><input onChange={e => setCCS(e.target.value)} type="text" className="bg-slate-200 dark:bg-white rounded-md text-black px-2"/></td>
                  <td>Select all classes (on screen) for sample</td>
                  <td><input onClick={() => {setIClass(allClasses);}} className="bg-slate-200 dark:bg-white text-black rounded-md px-2 border-black" type="button" value={"Click me!"}/></td>
                </tr>
                <tr>
                  <td className="border-t-2">Course name contains...</td>
                  <td className="border-t-2"><input onChange={e => setCNI(e.target.value)} type="text" className="bg-slate-200 dark:bg-white rounded-md text-black px-2"/></td>
                  <td>Unselect all classes for sample</td>
                  <td><input onClick={() => {setECourse([]);setIClass([]);}} className="bg-slate-200 dark:bg-white text-black rounded-md px-2 border-black" type="button" value={"Click me!"}/></td>
                </tr>
                <tr>
                  <td>Period must be...</td>
                  <td><input onChange={e => setCPIS(e.target.value)} type="text" className="bg-slate-200 dark:bg-white rounded-md text-black px-2"/></td>
                  <td>DOE Enrollment</td>
                  <td><input onChange={e => setDEN(parseInt(e.target.value))} type="number" min={1} className="bg-slate-200 dark:bg-white rounded-md text-black px-2"/></td>
                </tr>
                <tr>
                  <td>CDC Random Numbers</td>
                  <td colSpan={3}><input onChange={e => setCDCN(e.target.value)} type="text" className="bg-slate-200 dark:bg-white w-full rounded-md text-black px-2"/></td>
                </tr>
              </tbody>
            </table>
            {/* Show percentage based off of filtered classes */}
            <div className="mx-auto w-full text-center text-2xl">
              <b>RANGE: </b> {((filteredEnrollment / doeEn) * 100).toPrecision(3)}%<br/>
              {Math.abs(1 - (filteredEnrollment / doeEn)) > 0.10 ? <p className="text-red-500 font-bold">Out of 10% range</p> : <p className="text-green-500 font-bold text-lg">In 10% range</p>}
            </div>
            <div className="flex gap-x-5 px-1 -mb-10">
              {/* LEFT SIDE */}
              <div className="w-full">
                {/* TEACHER OVERVIEW */}
                <p className="text-center text-4xl font-semibold">Teacher Overview</p>
                <table className="mx-auto mb-5 text-sm info w-full">
                  <thead className="sticky top-0">
                    <tr className="dark:bg-slate-500 bg-slate-100">
                      <th>Teacher</th>
                      <th>Course Code</th>
                      <th>Name</th>
                      {/* Add a table header for each period */}
                      {periodKeys.filter(x => !unusedPeriods.includes(x)).map(x => <th key={"to"+x}>{periodSchool ? x : x.slice("Period ".length)}</th>)}
                      {periodSchool ? <th>Class Code</th> : null}
                    </tr>
                  </thead>
                  <tbody className="border-2">
                    {/* Add a row for each teacher and their class(es) */}
                    {teachersWithFilters.map(t => t.classes.map((c, i, classes) => {
                      const status = GetStatus(c.code, c.name);
                      const thisCourse = c.code+discriminator+t.name;
                      const excludedClasses = excludeCourses.includes(thisCourse) ? 'italic line-through text-gray-400' : '';
                      const rowSpan = periodSchool || excludedClasses.length ? 1 : 2;
                      const classname = status ? status + " text-black" : '';
                      const codeElement = c.periods.map((p,i) => {
                        const num = classCodeObj[c.code + discriminator + t.name + discriminator + periodKeys[i].slice("Period ".length)] ?? -1;
                        const doNotInclude = p === 0 || num <= 0;
                        const selected = !doNotInclude && numsSplit.includes(num);
                        if(!unusedPeriods.includes(periodKeys[i])) return num > 0 ? <td 
                          key={"classtable" + c.code + '-' + t.name + '-' + periodKeys[i]}
                          className={`text-center font-normal! h-max ${selected ? 'bg-green-100' : ''} text-red-500`}
                        >
                          {num}
                        </td> : null;
                      });
                      return <Fragment key={"teachertable" + c.code + '-' + t.name}>
                        <tr className={classes.length - 1 === i ? "border-b-2 border-b-slate-400" : ""}>
                          { /* add teacher name row only for first row since we do a row span */ }
                          {i == 0 ? <td rowSpan={periodSchool ? t.classes.length : (2 * t.classes.length - t.classes.filter(c => excludeCourses.includes(c.code + discriminator + t.name)).length)} className="text-center">{t.name}</td> : null}
                      
                          { /* show course code and name, then show exclude checkbox next to name */ }
                          <td rowSpan={rowSpan} className={classname + ' ' + excludedClasses}>{c.code}</td>
                          { /* show course name and exclusion checkbox */ }
                          <td rowSpan={rowSpan} className={classname + ' ' + excludedClasses}>
                            <div className="flex w-full gap-x-1">
                              {c.name} <input title="Click to exclude entire course from sample" className="ml-auto accent-red-500" type="checkbox" 
                                checked={excludeCourses.includes(thisCourse)}
                                onChange={(e) =>
                                  setECourse(
                                    e.target.checked ? 
                                      excludeCourses.concat(thisCourse) :
                                      excludeCourses.filter(c => c !== thisCourse)
                                  )}
                                />
                            </div>  
                          </td>
                          { /* map out periods */ }
                          {c.periods.map((p,j) => {
                            const isMergingClass = isMerging(classes, j, c);
                            const isLast = isLastClass(classes, i, j);
                            const isSelectedForQuery = query?.some(q => q.code === c.code && q.period === periodKeys[j].slice("Period ".length) && q.teacher === t.name);
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
                              for(let i2 = 0; i2 < classes.length; i2++) {
                                const cl = classes[i2];
                                if(!cl || cl.periods[j] === 0 || excludeCourses.includes(cl.code + discriminator + t.name)) continue;
                                code = cl.code;
                                break;
                              }
                            }
                            if(!code)
                              code = c.code;
                            // hide row if period is unused
                            // show table data and highlight as amber if we are looking at student info
                            return unusedPeriods.includes(periodKeys[j]) ? null : <td
                              key={t.name + '-' + c.code + '-' + j}
                              rowSpan={rowSpan === 1 ? 1 : p === 0 || num < 0 ? 2 : 1}
                              id={isSelectedForQuery ? 'queried' : ''}
                              className={
                                'font-normal! ' + 
                                (isSelectedForQuery ? "bg-amber-300 text-black" : `${classname.includes("bg-") ? 'text-blue-600' : 'text-blue-400!'} ${classname}`)}
                            >
                              { /* if period enrollment is 0 show nothing, otherwise show enrollment and checkbox to include class */ }
                              {p === 0 ? null : <div className="flex w-full gap-x-1">
                                <span className={`underline cursor-pointer`} 
                                // onclick will set our 'query' to look at students for this class
                                onClick={() => {
                                  if(!isSelectedForQuery)
                                    setTimeout(() => document.getElementById("student-overview")?.scrollIntoView({ behavior: "smooth" }), 250);
                                  setQuery(isSelectedForQuery ? undefined : t.classes.filter(t2 => t2.periods[j] > 0).map(c => ({
                                    code: c.code,
                                    period: periodKeys[j].slice("Period ".length),
                                    teacher: t.name
                                  })));
                                }}>{p}</span> {(0 < p && p < 10) && <span className="bg-yellow-300 text-red-500" title="Enrollment <10">{'☹'}</span>}<input 
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

                          {periodSchool ? codeElement : null}
                        </tr>

                        {/* show class code number if selected */}
                        {!periodSchool && !excludedClasses.length ? <tr>{codeElement}</tr> : null}
                      </Fragment>
                    }))}
                  </tbody>
                </table>
                {/* STUDENT OVERVIEW */}
                {query ? <div>
                  <div className="text-center text-4xl font-semibold bg-background w-full" id="student-overview">
                    Student Overview
                    <div className="mx-auto text-base font-normal">
                      <b>Selected class{query.length > 1 ? 'es' : null}</b><br/>
                      {query.map((q, i) => <Fragment key={'query'+i}>
                        {i === 0 ? <>{q.teacher} {q.period}<br/></> : null}
                        Course {q.code}<br/>
                      </Fragment>)}
                    </div>
                  </div>
                  <div>
                    <table className="mx-auto mb-5 info w-full">
                      <thead className="sticky top-0">
                        <tr className="dark:bg-slate-500 bg-slate-100">
                          <th>SSID</th>
                          <th>Student</th>
                          <th>Course Code</th>
                          <th>Course Name</th>
                          <th>Teacher</th>
                          <th>Pd</th>
                          <th>En</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(s => s.schedule.map((c, i) => {
                        const isThisClass = query?.some(q => q.code === c.code && q.period === c.period.toString() && q.teacher === c.teacher);
                        const status = isThisClass ? 'bg-amber-300' : GetStatus(c.code, c.name);
                        const appearsInOther = !disableApHighlight && !periods.length && teachersWithFilters.some(t => 
                          t.classes.some(c2 => 
                            // c2.code !== query.code && t.name !== query.teacher &&
                            !isThisClass && c2.code === c.code && t.name === c.teacher
                          )
                        );
                        const classname = appearsInOther ? "bg-yellow-300 dark:bg-white text-red-500 font-semibold" : (status ? status + " text-black" : '');
                        return <tr key={"studenttable" + c.code + '-' + s.name + '-' + c.period + '-' + c.teacher} title={
                            appearsInOther ? "Student appears in another class in the classes you filtered for." :
                            isThisClass ? "This is the class you clicked on in filters." : ''
                          }>
                          {i == 0 ? <td rowSpan={s.schedule.length} className="text-center">{s.ssid}</td> : null}
                          {i == 0 ? <td rowSpan={s.schedule.length} className="text-center">{s.name}</td> : null}
                          <td className={classname}>{c.code}</td>
                          <td className={classname}>{c.name}</td>
                          <td className={classname}>{c.teacher}</td>
                          <td className={classname + " text-center"}>{c.period}</td>
                          <td className={classname + " text-center"}>{c.enrollment}</td>
                        </tr>;
                      }))}
                      </tbody>
                    </table>
                  </div>
                </div> : null}
                {/* STICKY BOTTOM */}
                {query ? <BottomBar periodSchool={periodSchool}
                    excludeCourses={excludeCourses}
                    unusedPeriods={unusedPeriods}
                    numsSplit={numsSplit}
                    classCodeObj={classCodeObj}
                    teachersWithFilters={teachersWithFilters}
                    include={[includeClasses, setIClass]}
                    query={[query, setQuery]}/> : null}
              </div>
              {/* RIGHT SIDE */}
              <ColorCodes/>
            </div>
          </div>
        </div> : null}
        <pre>
        </pre>
      </div>
    </div>
  );
}