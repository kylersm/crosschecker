
export function Button(props: { onClick: () => void; className: string; } & React.PropsWithChildren) {
  return <div className={props.className + ' text-center font-semibold rounded-xl px-3 py-1 my-3 text-black'} onClick={props.onClick}>
    {props.children}
  </div>;
}
