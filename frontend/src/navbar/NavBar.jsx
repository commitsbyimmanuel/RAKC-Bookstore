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
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-9 shrink-0 rounded-xl">
            <img src="/logo_transp.png" alt="RAK Church" className="p-1" />
          </div>
          <h1 className="text-lg font-semibold tracking-wide">
            RAK Church Bookstore
          </h1>
        </div>
        <nav className="flex max-w-full items-center gap-2 overflow-x-auto p-0.5 scrollbar-hide" aria-label="Bookstore">
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
          <button
            type="button"
            onClick={auth.signOut}
            className="ml-1 inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-amber-300/40 bg-amber-400/15 px-4 text-sm font-semibold text-amber-100 transition-colors hover:border-amber-300/70 hover:bg-amber-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/60"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M16 8l4 4-4 4M9 12h11" />
            </svg>
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
