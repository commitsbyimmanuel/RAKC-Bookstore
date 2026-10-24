import { useNavigate } from "react-router";

function NavBarItem({ item, active }) {
  const style =
    "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-4 text-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60";
  const activeStyle = "ring-2 ring-inset ring-white/40";

  const navigate = useNavigate();

  return (
    <button
      key={item.label}
      type="button"
      aria-current={active ? "page" : undefined}
      className={`${style} ${active ? activeStyle : ""}`}
      onClick={() => {
        navigate(item.link);
      }}
    >
      {item.label}
    </button>
  );
}
export default NavBarItem;
