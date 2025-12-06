import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import { Save, Plus, Trash2 } from 'lucide-react';

interface FinancialProfile {
  monthly_salary: number;
  monthly_savings: number;
  current_balance: number;
  consider_savings: boolean;
}

interface CoolingRange {
  id: string;
  min_amount: number;
  max_amount: number | null;
  cooling_days: number;
}

export default function ProfileSetup() {
  const { user } = useUser();
  const [profile, setProfile] = useState<FinancialProfile>({
    monthly_salary: 0,
    monthly_savings: 0,
    current_balance: 0,
    consider_savings: false,
  });
  const [ranges, setRanges] = useState<CoolingRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRange, setNewRange] = useState({
    min_amount: 0,
    max_amount: '',
    cooling_days: 1,
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadRanges();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          monthly_salary: data.monthly_salary,
          monthly_savings: data.monthly_savings,
          current_balance: data.current_balance,
          consider_savings: data.consider_savings,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRanges = async () => {
    try {
      const { data, error } = await supabase
        .from('cooling_ranges')
        .select('*')
        .eq('user_id', user!.id)
        .order('min_amount');

      if (error) throw error;
      setRanges(data || []);
    } catch (error) {
      console.error('Error loading ranges:', error);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('financial_profiles')
        .update({
          monthly_salary: profile.monthly_salary,
          monthly_savings: profile.monthly_savings,
          current_balance: profile.current_balance,
          consider_savings: profile.consider_savings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user!.id);

      if (error) throw error;
      alert('Профиль сохранен!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const addRange = async () => {
    try {
      const { error } = await supabase.from('cooling_ranges').insert({
        user_id: user!.id,
        min_amount: newRange.min_amount,
        max_amount: newRange.max_amount ? Number(newRange.max_amount) : null,
        cooling_days: newRange.cooling_days,
      });

      if (error) throw error;

      setNewRange({ min_amount: 0, max_amount: '', cooling_days: 1 });
      loadRanges();
    } catch (error) {
      console.error('Error adding range:', error);
      alert('Ошибка при добавлении диапазона');
    }
  };

  const deleteRange = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cooling_ranges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadRanges();
    } catch (error) {
      console.error('Error deleting range:', error);
    }
  };

  if (loading) {
    return <div className="text-white">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
        <h2 className="text-2xl font-black text-white mb-6">Финансовый профиль</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-white font-bold mb-2">
              Месячная зарплата (₽)
            </label>
            <input
              type="number"
              value={profile.monthly_salary}
              onChange={(e) =>
                setProfile({ ...profile, monthly_salary: Number(e.target.value) })
              }
              className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">
              Откладываю в месяц (₽)
            </label>
            <input
              type="number"
              value={profile.monthly_savings}
              onChange={(e) =>
                setProfile({ ...profile, monthly_savings: Number(e.target.value) })
              }
              className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">
              Текущий баланс (₽)
            </label>
            <input
              type="number"
              value={profile.current_balance}
              onChange={(e) =>
                setProfile({ ...profile, current_balance: Number(e.target.value) })
              }
              className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.consider_savings}
              onChange={(e) =>
                setProfile({ ...profile, consider_savings: e.target.checked })
              }
              className="w-5 h-5 rounded border-2 border-zinc-700 text-[#FFDD2D] focus:ring-[#FFDD2D]"
            />
            <span className="text-white font-bold">
              Учитывать накопления при расчете
            </span>
          </label>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-[#FFDD2D] text-black font-black py-3 rounded-2xl hover:bg-[#FFE14D] transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохраняем...' : 'Сохранить профиль'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
        <h2 className="text-2xl font-black text-white mb-6">Диапазоны охлаждения</h2>

        <div className="space-y-4 mb-6">
          {ranges.map((range) => (
            <div
              key={range.id}
              className="bg-black rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="text-white">
                <span className="font-bold">
                  от {range.min_amount.toLocaleString('ru-RU')} ₽
                  {range.max_amount && ` до ${range.max_amount.toLocaleString('ru-RU')} ₽`}
                </span>
                <span className="text-gray-400 ml-3">
                  → {range.cooling_days} {range.cooling_days === 1 ? 'день' : 'дней'}
                </span>
              </div>
              <button
                onClick={() => deleteRange(range.id)}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            </div>
          ))}

          {ranges.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Нет диапазонов. Добавьте первый!
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-white font-bold">Добавить диапазон</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">От (₽)</label>
              <input
                type="number"
                value={newRange.min_amount}
                onChange={(e) =>
                  setNewRange({ ...newRange, min_amount: Number(e.target.value) })
                }
                className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">
                До (₽) - оставьте пустым для "бесконечности"
              </label>
              <input
                type="number"
                value={newRange.max_amount}
                onChange={(e) =>
                  setNewRange({ ...newRange, max_amount: e.target.value })
                }
                className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Дней охлаждения</label>
              <input
                type="number"
                value={newRange.cooling_days}
                onChange={(e) =>
                  setNewRange({ ...newRange, cooling_days: Number(e.target.value) })
                }
                className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={addRange}
            className="w-full bg-zinc-800 text-white font-bold py-3 rounded-2xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Добавить диапазон
          </button>
        </div>
      </div>
    </div>
  );
}
