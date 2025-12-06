import { useUser } from './contexts/UserContext';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

function App() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#FFDD2D] text-2xl font-black">Загрузка...</div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginScreen />;
}

export default App;
