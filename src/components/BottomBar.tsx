"use client";

import ReactDOMServer from "react-dom/server";
import { Button } from "./Button";
import { CSSProperties, Dispatch, Fragment, SetStateAction, useMemo } from "react";
import { discriminator, FinalSample, Period, periodKeys, QueryStudents, Teacher } from "@/lib/types";
import { isMerging } from "@/lib/util";

const goToSelected = () => {
    const y = (document.getElementById("queried")?.getBoundingClientRect().top ?? 0) + window.scrollY - 35;
    window.scrollTo({ top: y, behavior: "smooth"});
};

export default function BottomBar(props: {
    periodSchool: boolean;
    excludeCourses: string[];
    unusedPeriods: Period[];
    numsSplit: number[];
    classCodeObj: Record<string,number>;
    teachersWithFilters: Teacher[];
    include: [string[], Dispatch<SetStateAction<string[]>>];
    query: [QueryStudents[], Dispatch<SetStateAction<QueryStudents[] | undefined>>]
}) {
    const { periodSchool, excludeCourses, unusedPeriods, numsSplit, classCodeObj, teachersWithFilters, include: [includeClasses, setIClass], query: [query, setQuery] } = props;

    // generate the text to be pasted into the spreadsheet
    const unparse = useMemo<FinalSample[]>(() => {
    const arr: FinalSample[] = Object.entries(classCodeObj).filter(([, code]) => numsSplit.includes(code)).map(([key, code]) => {
      // get information from the key
      const destructKey = key.split(discriminator) as [string, string, string];
      const courseCode = destructKey[0];
      const teacher = destructKey[1].split(', ') as [string, string];
      const period = destructKey[2];
      const classEntry = teachersWithFilters.find(t => t.name === destructKey[1])?.classes.find(c => c.code === courseCode);
      const periodIndex = periodKeys.indexOf(("Period " + period) as Period);

      return {
        T_L_Name: teacher[0],
        T_F_Name: teacher[1],
        Period: period,
        Enrollment: classEntry?.periods[periodIndex].toString() ?? '-1',
        ClassCode: code.toString(),
        CourseName: classEntry?.name ?? "Not found"
      }
    }).sort((a, b) => a.T_L_Name.localeCompare(b.T_L_Name));

    return arr.concat(...new Array(Math.max(0, 15 - arr.length)).fill({
      T_L_Name: '',
      T_F_Name: '',
      Period: '',
      Enrollment: '',
      ClassCode: '',
      CourseName: ''
    }));
    }, [classCodeObj, teachersWithFilters, numsSplit]);

    const CopySampleButton = <Button onClick={() => {
    const content = ReactDOMServer.renderToStaticMarkup(<table style={{ fontFamily: "Calibri", fontSize: "12pt" }}>
        <tbody>
        <tr style={{ fontFamily: "Times New Roman", fontWeight: "bold" }}>
          <td>T_L_Name</td>
          <td>T_F_Name</td>
          <td style={{ color: "#f00" }}>Period #</td>
          <td>Enrollment</td>
          <td>Class Code</td>
          <td>Class</td>
        </tr>
        {unparse.map((row, i) => <tr key={i}>
          <td>{row.T_L_Name}</td>
          <td>{row.T_F_Name}</td>
          <td>{row.Period}</td>
          <td>{row.Enrollment}</td>
          <td>{row.ClassCode}</td>
          <td>{row.CourseName}</td>
          {
            i === 0 ?  <><td/><td/><td/><td/><td/><td style={{ fontFamily: "Times New Roman", fontWeight: "bold", color: "#f00" }}>Do not edit the Class</td></> :
            i === 1 ?  <><td/><td/><td/><td/><td/><td>Look on the school page, if you think the report page is truncated.</td></> :
            i === 13 ? <><td/><td/><td/><td style={{ fontFamily: "Times New Roman "}}>{unparse.reduce((p, c) => p + (parseInt(c.Enrollment) || 0), 0)}</td><td style={{ fontFamily: "Times New Roman "}}>enrollment</td></> :
            i === 14 ? <><td/><td/><td/><td>{Math.max(...Object.values(classCodeObj))}</td><td># of classes</td></> : null
          }
        </tr>)}
        </tbody>
    </table>);
    // copy WITH FORMATTING to clipboard with a lot of ease
    navigator.clipboard.write([new ClipboardItem({
        // style prop has to be used instead of tailwind classes
        "text/html":  new Blob([content], { type: "text/html" })
    })])
    }} className="bg-amber-500">
    Copy sample
    </Button>;

    // generate the table for sampling to be pasted into the spreadsheet
    const excludedStyle: CSSProperties = { backgroundColor: "#ffff00" };
    const CopyTableButton = <Button onClick={() => {
    const content = ReactDOMServer.renderToStaticMarkup(<table style={{ fontFamily: "Calibri", fontSize: "12pt" }}>
      <thead>
        <th>Course Code</th>
        <th>Course Name</th>
        <th>Teacher</th>
        {periodKeys.filter(x => !unusedPeriods.includes(x)).map(x => <th key={"cpyto"+x}>{x}</th>)}
      </thead>
      <tbody>
        {teachersWithFilters.map(t => t.classes.map((c, i, classes) => {
          const thisCourse = c.code+discriminator+t.name;
          const isExcluded = excludeCourses.includes(thisCourse);
          const style = { ...(isExcluded ? excludedStyle : undefined) };
          const codeElement = c.periods.map((p,i) => {
          const includePeriod = includeClasses.includes(c.code + discriminator + t.name + discriminator + (periodKeys[i].slice("Period ".length)));
          const doNotInclude = p === 0 || !includePeriod;
          const num = classCodeObj[c.code + discriminator + t.name + discriminator + periodKeys[i].slice("Period ".length)] ?? -1;
          const selected = !doNotInclude && numsSplit.includes(num);
          const isMergingClass = isMerging(classes, i, c);
          if(!unusedPeriods.includes(periodKeys[i])) return num > 0 ? <td 
            key={"copyclasstable" + c.code + '-' + t.name + '-' + periodKeys[i]}
            style={{ ...style, color: "#f00", backgroundColor: selected ? 'rgb(217, 234, 211)' : isMergingClass ? 'rgb(252, 229, 205)' : ''}}
          >
            {num}
          </td> : null;
          });
            return <Fragment key={"copyteachertable" + c.code + '-' + t.name}>
            <tr>
                { /* add teacher name row only for first row since we do a row span */ }
                <td style={style}>{c.code}</td>
                <td style={style}>{c.name}</td>
                <td style={style}>{t.name}</td>
                {c.periods.map((p,j) => {
                const isMergingClass = classes.filter(c2 => c2.periods[j] > 0).length > 1;
                const includePeriod = includeClasses.includes(c.code + discriminator + t.name + discriminator + (periodKeys[j].slice("Period ".length)));
                const num = classCodeObj[c.code + discriminator + t.name + discriminator + periodKeys[j].slice("Period ".length)] ?? -1;
                const doNotInclude = p === 0 || !includePeriod;
                const selected = !doNotInclude && numsSplit.includes(num);
                return unusedPeriods.includes(periodKeys[j]) ? null : <td
                    key={t.name + '-' + c.code + '-' + j}
                    rowSpan={isExcluded || periodSchool ? 1 : p === 0 || num < 0 ? 2 : 1}
                    style={{ ...style, backgroundColor: (
                    (!isExcluded && isMergingClass) ? 'rgb(252, 229, 205)' :
                    p > 0 ? selected ? 'rgb(217, 234, 211)' : (num < 0 ? excludedStyle.backgroundColor : style.backgroundColor) : style.backgroundColor
                    ) }}
                >
                    {p === 0 ? '' : <div className="flex w-full gap-x-1">
                    <span>{p}</span>
                    </div>}
                </td>;
                })}
                {periodSchool ? codeElement : null}
            </tr>

            {/* show class code number if selected */}
            {!periodSchool && !isExcluded ? <tr>
                <td/><td/><td/>
                {codeElement}
            </tr> : null}
            </Fragment>
        }))}
        </tbody>
    </table>);
    navigator.clipboard.write([new ClipboardItem({
        // style prop has to be used instead of tailwind classes
        "text/html": new Blob([content], { type: "text/html" })
    })])
    }} className="bg-amber-400">
    Copy table
    </Button>;

    return <div className="sticky bottom-0 w-full bg-background shadow-black shadow-2xl py-2 px-2">
      <i>See student overview before clicking</i>
      <div className="flex gap-x-2">
          <Button onClick={() => {
          setIClass(ic => ic.filter(i => !query.map(q => q.code + discriminator + q.teacher + discriminator + q.period).includes(i)));
          goToSelected();
          }} className="bg-red-400">
              Exclude Class
          </Button>
          <Button onClick={() => {
          setIClass(ic => ic.concat(query.map(q => q.code + discriminator + q.teacher + discriminator + q.period)));
          goToSelected();
          }} className="bg-green-400">
          Include Class
          </Button>
          <div className="border-r-2 mx-4"/>
          <Button onClick={() => {
          if(query[0]) {
              let teacherIndex = teachersWithFilters.findIndex(t => t.name === query[0].teacher);
              let classIndex = teachersWithFilters[teacherIndex].classes.findIndex(c => c.code === query[0].code);
              let periodIndex = periodKeys.indexOf("Period " + query[0].period as Period);

              while(true) {
                if(periodIndex - 1 < 0) {
                  periodIndex = periodKeys.length - 1;
                  if(classIndex - 1 < 0) {
                    if(teacherIndex - 1 < 0) {
                      alert("At start of list");
                      break;
                    } else teacherIndex--;
                    classIndex = teachersWithFilters[teacherIndex].classes.length - 1;
                  } else classIndex--;
                } else periodIndex--;

                const teacher = teachersWithFilters[teacherIndex];
                const enrollment = teacher.classes[classIndex].periods[periodIndex];
                if(enrollment > 0 && teacher.classes.every((c, i) => classIndex <= i || c.periods[periodIndex] === 0 || excludeCourses.includes(c.code + discriminator + teacher.name))) {
                  setQuery(teacher.classes.filter(t => t.periods[periodIndex] > 0).map(c => ({
                    code: c.code,
                    period: periodKeys[periodIndex].slice("Period ".length),
                    teacher: teacher.name
                  })));
                  break;
                }
              }
          }
          }} className="bg-indigo-400">
          Previous Class
          </Button>
          <Button onClick={() => {
          if(query[0]) {
              let teacherIndex = teachersWithFilters.findIndex(t => t.name === query[0].teacher);
              let classIndex = teachersWithFilters[teacherIndex].classes.findIndex(c => c.code === query[0].code);
              let periodIndex = periodKeys.indexOf("Period " + query[0].period as Period);

              while(true) {
                if(periodIndex + 1 >= periodKeys.length) {
                  periodIndex = 0;
                  if(classIndex + 1 >= teachersWithFilters[teacherIndex].classes.length) {
                    classIndex = 0;
                    if(teacherIndex + 1 >= teachersWithFilters.length) {
                      alert("at end of list");
                      break;
                    } else teacherIndex++;
                  } else classIndex++;
                } else periodIndex++;

                const teacher = teachersWithFilters[teacherIndex];
                const enrollment = teacher.classes[classIndex].periods[periodIndex];
                if(enrollment > 0 && teacher.classes.every((c, i) => classIndex <= i || c.periods[periodIndex] === 0 || excludeCourses.includes(c.code + discriminator + teacher.name))) {
                  setQuery(teacher.classes.filter(t => t.periods[periodIndex] > 0).map(c => ({
                    code: c.code,
                    period: periodKeys[periodIndex].slice("Period ".length),
                    teacher: teacher.name
                  })));
                  break;
                }
              }
          }
          }} className="bg-blue-400">
          Next Class
          </Button>
          <div className="border-r-2 mx-4"/>
          {CopyTableButton}
          {CopySampleButton}
      </div>
    </div>;
}