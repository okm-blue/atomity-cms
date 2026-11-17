"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

const links = [
  { href: "/content", label: "Content", mark: "C" },
  { href: "/media", label: "Media", mark: "M" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const updateDirtyState = (event: Event) => {
      setHasUnsavedChanges((event as CustomEvent<boolean>).detail);
    };
    const redirectToSignIn = () => router.replace("/signin");
    const guardNavigation = (event: MouseEvent) => {
      if (!hasUnsavedChanges || event.defaultPrevented || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link || link.origin !== window.location.origin || link.pathname === pathname) return;
      if (!window.confirm("You have unsaved changes. Leave this page and discard them?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("cms-unsaved-change", updateDirtyState);
    window.addEventListener("cms-auth-expired", redirectToSignIn);
    document.addEventListener("click", guardNavigation, true);
    return () => {
      window.removeEventListener("cms-unsaved-change", updateDirtyState);
      window.removeEventListener("cms-auth-expired", redirectToSignIn);
      document.removeEventListener("click", guardNavigation, true);
    };
  }, [hasUnsavedChanges, pathname, router]);

  async function signOut() {
    if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Sign out and discard them?")) return;
    setSigningOut(true);
    await fetch("/api/cms/logout", { method: "POST" });
    router.replace("/signin");
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link className="brand" href="/content" aria-label="Atomity CMS home">
          <span className="brand-mark">a</span>
          <span>atomity<span className="brand-light">cms</span></span>
        </Link>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          {links.map((link) => (
            <Link
              className={`side-link ${pathname.startsWith(link.href) ? "active" : ""}`}
              href={link.href}
              key={link.href}
            >
              <span className="nav-mark">{link.mark}</span>{link.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-avatar">A</div>
          <div className="admin-details"><strong>Admin</strong><span>Workspace owner</span></div>
          <button className="icon-button signout" title="Sign out" onClick={signOut} disabled={signingOut}>
            ↗
          </button>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="crumb">Workspace <span>/</span> <b>{pathname.startsWith("/media") ? "Media" : "Content"}</b></div>
          <div className="topbar-right"><span className="connection-dot" /> Local workspace</div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
