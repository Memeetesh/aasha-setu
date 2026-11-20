"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const navItems = [
  { href: "/", icon: "Home", label: "Home" },
  { href: "/family", icon: "Users", label: "Family" },
  { href: "/emergency", icon: "Siren", label: "Emergency" },
  { href: "/report", icon: "AlertTriangle", label: "Report incident" },
  { href: "/reports", icon: "FileText", label: "My reports" },
  { href: "/support", icon: "HeartHandshake", label: "Support" },
];

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`flex flex-col h-full bg-navy-900 text-white ${isMobile ? "w-72" : "w-64"} flex-shrink-0`}>
      <div className="px-6 py-6 border-b border-navy-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-800 flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-7 h-7">
                <path d="M5 25 Q20 12 35 25" stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M5 25 L35 25" stroke="#fbbf24" strokeWidth="2" fill="none" strokeLinecap="round" />
                <line x1="10" y1="25" x2="10" y2="30" stroke="#88a3d0" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="20" y1="25" x2="20" y2="30" stroke="#88a3d0" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="30" y1="25" x2="30" y2="30" stroke="#88a3d0" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="20" cy="14" r="3.5" fill="#fbbf24" />
                <path d="M20 6 L20 8.5 M14 9 L15.5 10.5 M26 9 L24.5 10.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold leading-tight">Aasha Setu</p>
              <p className="text-xs text-navy-300 leading-tight mt-0.5">Disaster intelligence &amp; response</p>
            </div>
          </div>
          {isMobile && onClose && (
            <button onClick={onClose} className="text-navy-300 hover:text-white transition-colors p-1">
              <Icon name="X" className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors no-tap-highlight ${
                  active ? "bg-white/10 text-white font-medium" : "text-navy-200 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon name={item.icon} className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-white" : "text-navy-300"}`} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-3 pb-4">
        <div className="bg-navy-800 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <Icon name="ShieldCheck" className="w-5 h-5 text-safe-400 flex-shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-white">You are safe</p>
              <p className="text-xs text-navy-300 leading-snug mt-0.5">No active critical alerts in your area</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
