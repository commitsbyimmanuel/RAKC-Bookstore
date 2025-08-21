import { useNavigate } from "react-router";

function NavBarItem({ item, active }) {
  const style =
    "rounded-full border border-white/20 px-4 py-2 text-sm transition bg-white/10 hover:bg-white/20 active:scale-95";
  const activeStyle = "ring-2 ring-white/40";

  const navigate = useNavigate();

  return (
    <button
      key={item.label}
      className={`${style} ${active && activeStyle}`}
      onClick={() => {
        navigate(item.link);
      }}
    >
      {item.label}
    </button>
  );
}
export default NavBarItem;
