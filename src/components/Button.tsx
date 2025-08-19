export default function Button(props: { onClick: () => void; className: string; } & React.PropsWithChildren) {
  return <div className={props.className + ' flex text-center font-semibold rounded-xl px-3 py-1 my-3 text-black h-fit'} onClick={props.onClick}>
    <div className="m-auto">
      {props.children}
    </div>
  </div>;
}