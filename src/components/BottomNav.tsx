import { NavLink } from "react-router-dom";
import { IconHome, IconList, IconTag, IconSettings } from "./Icons";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: IconHome },
  { to: "/transactions", label: "Riwayat", icon: IconList },
  { to: "/categories", label: "Kategori", icon: IconTag },
  { to: "/settings", label: "Pengaturan", icon: IconSettings },
];

function navLinkClass(isActive: boolean, variant: "bottom" | "side") {
  const activeColor = isActive ? "text-ledger-500" : "text-ink-faint";
  if (variant === "bottom") {
    return `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium ${activeColor}`;
  }
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? "bg-ledger-50 text-ledger-600" : "text-ink-soft hover:bg-paper-line/60"
  }`;
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-paper-line bg-paper-card/95 backdrop-blur md:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => navLinkClass(isActive, "bottom")}>
          <Icon width={20} height={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function SideNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-paper-line bg-paper-card px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ledger-500 font-display text-sm font-semibold text-white">
          K
        </div>
        <span className="font-display text-lg font-semibold text-ink">Kas</span>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => navLinkClass(isActive, "side")}>
            <Icon width={19} height={19} />
            {label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
