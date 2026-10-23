import NavBarItem from "./NavBarItem";
import { useAuth } from "../auth/auth-context";

export default function NavBar() {
  const auth = useAuth();
  const currentPath = window.location.pathname;
  const currentPathNormalized = currentPath.startsWith("/")
    ? currentPath.slice(1)
    : currentPath;
  const currentPage = currentPathNormalized ? currentPathNormalized : "home";

  return (
    <header className="relative z-20 mx-auto w-full rounded-2xl border border-white/20 bg-black/50 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-9 rounded-xl">
            <img src="./logo_transp.png" className="p-1" />
          </div>
          <h1 className="text-lg font-semibold tracking-wide">
            RAK Church Bookstore
          </h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Bookstore">
          {[
            { key: "home", label: "Home", link: "/" },
            { key: "orders", label: "Orders", link: "/orders" },
            { key: "payments", label: "Payments", link: "/payments" },
            { key: "reports", label: "Reports", link: "/reports" },
            { key: "stock", label: "Stock", link: "/stock" },
          ].map((item) => (
            <NavBarItem
              key={item.key}
              item={item}
              active={item.key === currentPage ? true : false}
            />
          ))}
        </nav>
      </div>
      <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
        <span className="min-w-0 truncate text-white/65">{auth.user?.name || auth.user?.email}</span>
        <button type="button" onClick={auth.signOut} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/10">Sign out</button>
      </div>
    </header>
  );
}
