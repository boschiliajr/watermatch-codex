"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/cadastros", label: "Cadastros" },
    { href: "/tabelas", label: "Tabelas" },
    { href: "/projetos", label: "Projetos" }
  ];

  return (
    <aside className="sidebar">
      <div>
        <p className="sidebar-kicker">WaterTech</p>
        <h1 className="sidebar-title">Match PIT</h1>
      </div>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        {items.map((it) => {
          const active = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              className={active ? "nav-item nav-item-active" : "nav-item"}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">B2B para FEHIDRO</div>
    </aside>
  );
}

