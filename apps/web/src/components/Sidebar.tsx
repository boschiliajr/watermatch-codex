"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
    { href: "/empresas", label: "Empresas", icon: "companies" as const },
    { href: "/prefeituras", label: "Prefeituras", icon: "municipalities" as const },
    { href: "/demandas", label: "Demandas", icon: "demands" as const },
    { href: "/matches", label: "Matches", icon: "matches" as const },
    { href: "/projetos", label: "Projetos", icon: "projects" as const }
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
              <span className="shrink-0">
                <Icon name={it.icon} />
              </span>
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">Protótipo para FEHIDRO</div>
    </aside>
  );
}
