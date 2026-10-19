import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookTabs,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";

import { Button } from "@/components/ui";
import { useAuthSession } from "@/context/AuthSessionContext";
import { roleLabel } from "@/types/auth";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const STUDENT_NAV: NavItem[] = [
  { to: "/estudiante", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/estudiante/calificaciones", label: "Mis calificaciones", icon: GraduationCap },
  { to: "/estudiante/actividades", label: "Mis actividades", icon: NotebookTabs },
  { to: "/estudiante/entregas", label: "Mis entregas", icon: FileCheck2 },
  { to: "/estudiante/perfil", label: "Mi perfil", icon: UserRound },
];

const TEACHER_NAV: NavItem[] = [
  { to: "/profesor", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/profesor/grupos", label: "Grupos y asignaturas", icon: Users },
  { to: "/profesor/asistencia", label: "Asistencia", icon: CalendarCheck },
  { to: "/profesor/actividades", label: "Actividades", icon: BookOpen },
  { to: "/profesor/calificaciones", label: "Calificaciones", icon: ClipboardCheck },
];

function initialsOf(nombres?: string, apellidos?: string): string {
  const initials = [nombres, apellidos]
    .map((part) => part?.trim().charAt(0) ?? "")
    .join("")
    .toUpperCase();
  return initials || "SG";
}

/**
 * Shell of the authenticated application: sidebar with the navigation of the active role, top
 * bar, user card and the local logout action. The session token is never rendered.
 */
export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, role, clearSession } = useAuthSession();

  const isStudent = role === "ESTUDIANTE";
  const navigation = isStudent ? STUDENT_NAV : TEACHER_NAV;
  const fullName = user ? `${user.nombres} ${user.apellidos}` : "Sesión activa";
  const initials = initialsOf(user?.nombres, user?.apellidos);
  const activeItem = navigation
    .filter(({ to }) => pathname === to || pathname.startsWith(`${to}/`))
    .sort((left, right) => right.to.length - left.to.length)[0];
  const activeLabel = activeItem?.label ?? (isStudent ? "Mi espacio" : "Espacio docente");

  return (
    <div className="app-shell">
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <GraduationCap />
          </div>
          <div>
            <strong>SIGEA</strong>
            <span>Aprender y acompañar</span>
          </div>
          <Button variant="ghost" className="mobile-close" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <X />
          </Button>
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          <p>{isStudent ? "MI ESPACIO" : "ESPACIO DOCENTE"}</p>
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <NavLink to="/login" onClick={clearSession}>
            <LogOut aria-hidden="true" />
            <span>Cerrar sesión</span>
          </NavLink>
          <div className="user-card">
            <span className="avatar avatar-small">{initials}</span>
            <div>
              <strong>{fullName}</strong>
              <span>{roleLabel(role)}</span>
            </div>
            <ChevronDown aria-hidden="true" />
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div className="topbar-title">
            <Button variant="ghost" className="menu-button" onClick={() => setOpen(true)} aria-label="Abrir menú">
              <Menu />
            </Button>
            <div>
              <span>Institución Educativa Horizonte</span>
              <strong>{activeLabel}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-button" aria-label="Notificaciones">
              <Bell />
              <span className="notification-dot" />
            </button>
            <div className="header-avatar">{initials}</div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
