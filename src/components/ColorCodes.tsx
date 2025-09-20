import { CourseStatus } from "@/lib/util";

export default function ColorCodes() {
    return <div className="w-fit max-w-[10rem] sticky top-0 self-start h-screen overflow-y-scroll">
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
  </div>
}