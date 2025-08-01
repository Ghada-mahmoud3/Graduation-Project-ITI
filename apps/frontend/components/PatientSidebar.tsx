import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

interface PatientSidebarProps {
  activeItem?: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', href: '/dashboard' },
  { id: 'profile', label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', href: '/profile' },
  { id: 'requests', label: 'My Requests', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', href: '/requests' },
  { id: 'create-request', label: 'Create Request', icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z', href: '/requests/create' },
  { id: 'find-nurses', label: 'Find Nurses', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', href: '/nurses' },
  { id: 'completed-requests', label: 'Completed Requests', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', href: '/patient-completed-requests' },
  { id: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', href: '/notifications' },
  { id: 'payments', label: 'Payments', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z', href: '/payments' },

  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', href: '/settings' },

  { id: 'logout', label: 'Logout', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1', href: '/logout' }
];

export default function PatientSidebar({ activeItem }: PatientSidebarProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Auto-detect active item based on current route if not provided
  const currentActiveItem = activeItem || (() => {
    const pathname = router.pathname;
    if (pathname === '/dashboard' || pathname === '/') return 'dashboard';
    if (pathname.startsWith('/requests')) return 'requests';
    if (pathname === '/nurses' || pathname.startsWith('/nurses')) return 'find-nurses';
    if (pathname === '/patient-completed-requests') return 'completed-requests';
    if (pathname.startsWith('/notifications')) return 'notifications';
    if (pathname.startsWith('/payments')) return 'payments';

    if (pathname.startsWith('/profile')) return 'profile';
    if (pathname.startsWith('/settings')) return 'settings';

    return '';
  })();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      {/* Logo and User Info */}
      <div className="px-6 pt-8 pb-6 border-b border-gray-200">
        <Link href="/">
          <div className="flex items-center space-x-2">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-lg font-semibold text-gray-900">NurseConnect</span>
          </div>
        </Link>
        
        <div className="mt-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0) || 'P'}
            </div>
            <div>
              <p className="font-medium text-gray-800 truncate max-w-[150px]">{user?.name || 'Patient'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || 'Patient'}</p>
            </div>
          </div>
        </div>
      </div>

        {/* Navigation Items */}
        <nav className="px-4 py-4">
          <ul className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = currentActiveItem === item.id;
              // Skip rendering logout button since it's handled separately
              if (item.id === 'logout') return null;
              return (
                <li key={item.id}>
                  <Link href={item.href}>
                    <div className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                      <svg
                        className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={item.icon} />
                      </svg>
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
            {/* Logout button */}
            <li>
              <a onClick={handleLogout} className="cursor-pointer">
                <div className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100">
                  <svg
                    className="h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium">Logout</span>
                </div>
              </a>
            </li>
          </ul>
        </nav>
      </div>
   
  );
}
