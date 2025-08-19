"use client";
import { Dispatch, SetStateAction, PropsWithChildren } from "react";
import ReactDOMServer from "react-dom/server";

export default function TextArea(props: { setter: Dispatch<SetStateAction<string | undefined>>; } & PropsWithChildren) {
  return <>
    <p>{props.children}</p>
    <textarea
      onChange={e => props.setter(e.target.value)}
      className="h-40 resize-none bg-gray-100 text-black w-full rounded-md px-2 py-1 shadow-inner shadow-black"
      placeholder={"Paste " + ReactDOMServer.renderToString(props.children).toLowerCase() + " from Google sheets here"} />
  </>;
}
