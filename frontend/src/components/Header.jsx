import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Feather } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const linkCls = ({ isActive }) =>
  `text-sm tracking-wide px-3 py-2 rounded-full transition-colors duration-200 ${isActive ? "bg-[#121113] text-[#FAF7F2]" : "text-stone-700 hover:bg-stone-200/70"}`;

export function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#FAF7F2]/85 border-b border-stone-900/10" data-testid="site-header">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 h-16 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
          <span className="w-8 h-8 rounded-full bg-[#E05A47] grid place-items-center text-white"><Feather size={16} /></span>
          <span className="font-display text-2xl tracking-tight">VelvetNote</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-4">
          <NavLink to="/shop" className={linkCls} data-testid="nav-shop">Card Shop</NavLink>
          <NavLink to="/create" className={linkCls} data-testid="nav-builder">Design Studio</NavLink>
          {user && <NavLink to="/my-cards" className={linkCls} data-testid="nav-my-cards">My Cards</NavLink>}
          {user?.role === "admin" && <NavLink to="/studio" className={linkCls} data-testid="nav-admin-studio">Business Studio</NavLink>}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden sm:block text-sm text-stone-600" data-testid="header-user-name">{user.name}</span>
              <button
                data-testid="logout-btn"
                onClick={async () => { await logout(); nav("/"); }}
                className="p-2 rounded-full hover:bg-stone-200 transition-colors"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm px-4 py-2 rounded-full hover:bg-stone-200 transition-colors" data-testid="header-login-btn">Sign in</Link>
              <Link to="/register" className="text-sm px-4 py-2 rounded-full bg-[#E05A47] text-white hover:bg-[#C84B39] transition-colors" data-testid="header-register-btn">Join free</Link>
            </>
          )}
        </div>
      </div>
      <nav className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
        <NavLink to="/shop" className={linkCls}>Shop</NavLink>
        <NavLink to="/create" className={linkCls}>Studio</NavLink>
        {user && <NavLink to="/my-cards" className={linkCls}>My Cards</NavLink>}
        {user?.role === "admin" && <NavLink to="/studio" className={linkCls}>Business</NavLink>}
      </nav>
    </header>
  );
}
