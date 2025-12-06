import { useState } from 'react';
import { useUser } from '../contexts/UserContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Введите никнейм');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username);
    } catch (err) {
      setError('Что-то пошло не так. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-[#FFDD2D] mb-2">
            Охлаждение
          </h1>
          <p className="text-gray-400 text-lg">
            Помогаем принимать взвешенные финансовые решения
          </p>
        </div>

        <div className="bg-zinc-900 rounded-3xl p-8 shadow-2xl border border-zinc-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-white font-bold text-lg mb-2">
                Придумайте никнейм
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vasya_pupkin"
                className="w-full px-4 py-4 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none transition-colors text-lg"
                disabled={loading}
              />
              {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFDD2D] text-black font-black text-lg py-4 rounded-2xl hover:bg-[#FFE14D] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Никаких паролей. Просто никнейм.
          </div>
        </div>
      </div>
    </div>
  );
}
