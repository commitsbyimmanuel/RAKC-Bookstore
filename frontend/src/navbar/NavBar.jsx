import NavBarItem from "./NavBarItem";

export default function NavBar() {
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
        <nav className="flex items-center gap-2">
          {[
            { key: "home", label: "Home", link: "/" },
            { key: "orders", label: "Orders", link: "/orders" },
            { key: "payments", label: "Payments", link: "/payments" },
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
    </header>
  );
}
