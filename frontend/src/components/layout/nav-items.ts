import type { Role } from "@/types/api";

export interface NavItem {
  href: string;
  label: string;
  /** SVG path(s) of a 24x24 stroke icon. */
  icon: string;
  /** Only these roles see the link. Not set = everyone. */
  roles?: Role[];
}

/** Sidebar links (docs/03, section 3). */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: "M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z",
  },
  {
    href: "/projects",
    label: "Projets",
    icon: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  },
  {
    href: "/servers",
    label: "Serveurs",
    icon: "M4 4h16v6H4zm0 10h16v6H4zM8 7h.01M8 17h.01",
  },
  {
    href: "/applications",
    label: "Applications",
    icon: "M12 3 3 8l9 5 9-5zM3 13l9 5 9-5",
  },
  {
    href: "/monitoring",
    label: "Monitoring",
    icon: "M3 12h4l3 8 4-16 3 8h4",
  },
  {
    href: "/alerts",
    label: "Alertes",
    icon: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9m4.3 13a1.9 1.9 0 0 0 3.4 0",
  },
  {
    href: "/users",
    label: "Utilisateurs",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
    roles: ["ADMIN"],
  },
];

/** "/servers/123" is inside "/servers"; "/" only matches itself. */
export function isActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}
