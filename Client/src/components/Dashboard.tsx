import { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { Home, ShoppingCart, Settings, History, User, LogOut, Shield } from 'lucide-react';
import ProfileSetup from './ProfileSetup';
import PurchasesList from './PurchasesList';
import AddPurchase from './AddPurchase';
import SettingsPage from './SettingsPage';
import PurchaseHistory from './PurchaseHistory';
import AdminPanel from './AdminPanel';

type Page = 'home' | 'purchases' | 'add-purchase' | 'settings' | 'history' | 'admin';

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const { user, logout } = useUser();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <ProfileSetup />;
      case 'purchases':
        return <PurchasesList onAddPurchase={() => setCurrentPage('add-purchase')} />;
      case 'add-purchase':
        return <AddPurchase onBack={() => setCurrentPage('purchases')} />;
      case 'settings':
        return <SettingsPage />;
      case 'history':
        return <PurchaseHistory />;
      case 'admin':
        return <AdminPanel onBack={() => setCurrentPage('home')} />;
      default:
        return <ProfileSetup />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FFDD2D] rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-black text-black">О</span>
              </div>
              <h1 className="text-2xl font-black text-white">Охлаждение</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[#FFDD2D] font-bold">@{user?.username}</div>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                title="Выйти"
              >
                <LogOut className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setCurrentPage('home')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
              currentPage === 'home'
                ? 'bg-[#FFDD2D] text-black'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <User className="w-5 h-5" />
            Профиль
          </button>

          <button
            onClick={() => setCurrentPage('purchases')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
              currentPage === 'purchases' || currentPage === 'add-purchase'
                ? 'bg-[#FFDD2D] text-black'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Желаемое
          </button>

          <button
            onClick={() => setCurrentPage('history')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
              currentPage === 'history'
                ? 'bg-[#FFDD2D] text-black'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <History className="w-5 h-5" />
            История
          </button>

          <button
            onClick={() => setCurrentPage('settings')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
              currentPage === 'settings'
                ? 'bg-[#FFDD2D] text-black'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            Настройки
          </button>

          <button
            onClick={() => setCurrentPage('admin')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
              currentPage === 'admin'
                ? 'bg-[#FFDD2D] text-black'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <Shield className="w-5 h-5" />
            Админ
          </button>
        </nav>

        <main>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
