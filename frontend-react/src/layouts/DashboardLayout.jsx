/**
 * DashboardLayout — Wraps all authenticated routes.
 * Contains Masthead, SubHeader, Sidebar, and <Outlet />.
 * Sidebar sits OUTSIDE <Outlet> so it never unmounts on navigation.
 */
import { Outlet } from 'react-router-dom';
import Masthead from '../components/Masthead';
import SubHeader from '../components/SubHeader';
import Sidebar from '../components/Sidebar';
import useAppStore from '../store/useAppStore';

export default function DashboardLayout() {
  const isCollapsed = useAppStore((s) => s.isCollapsed);

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F2F5]">
      <Masthead />
      <SubHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={`
            flex-1 overflow-y-auto transition-all duration-300
          `}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
