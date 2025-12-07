import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, AlertTriangle, Calendar } from 'lucide-react';

interface CoolingRange {
  min_amount: number;
  max_amount: number | null;
  cooling_days: number;
}

export default function AddPurchase({ onBack }: { onBack: () => void }) {
  const { user } = useUser();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [url, setUrl] = useState('');
  const [ranges, setRanges] = useState<CoolingRange[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [coolingInfo, setCoolingInfo] = useState<{ days: number; until: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadRanges();
      loadBlacklist();
    }
  }, [user]);

  useEffect(() => {
    if (price && ranges.length > 0) {
      calculateCooling();
    } else {
      setCoolingInfo(null);
    }
  }, [price, ranges]);

  useEffect(() => {
    if (category && blacklist.length > 0) {
      checkBlacklist();
    } else {
      setWarning(null);
    }
  }, [category, blacklist]);

  const loadRanges = async () => {
    try {
      const { data, error } = await supabase
        .from('cooling_ranges')
        .select('min_amount, max_amount, cooling_days')
        .eq('user_id', user!.id)
        .order('min_amount');

      if (error) throw error;
      setRanges(data || []);
    } catch (error) {
      console.error('Error loading ranges:', error);
    }
  };

  const loadBlacklist = async () => {
    try {
      const { data, error } = await supabase
        .from('categories_blacklist')
        .select('category_name')
        .eq('user_id', user!.id);

      if (error) throw error;
      setBlacklist(data?.map((item) => item.category_name.toLowerCase()) || []);
    } catch (error) {
      console.error('Error loading blacklist:', error);
    }
  };

  const calculateCooling = () => {
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      setCoolingInfo(null);
      return;
    }

    let coolingDays = 1;

    for (const range of ranges) {
      if (priceNum >= range.min_amount) {
        if (range.max_amount === null || priceNum <= range.max_amount) {
          coolingDays = range.cooling_days;
          break;
        }
      }
    }

    const coolingDate = new Date();
    coolingDate.setDate(coolingDate.getDate() + coolingDays);

    setCoolingInfo({
      days: coolingDays,
      until: coolingDate.toISOString(),
    });
  };

  const checkBlacklist = () => {
    const categoryLower = category.toLowerCase();
    const found = blacklist.find((bl) =>
      categoryLower.includes(bl) || bl.includes(categoryLower)
    );

    if (found) {
      setWarning(`Внимание! Категория "${category}" может быть в вашем черном списке (${found})`);
    } else {
      setWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !price || !category || !coolingInfo) {
      alert('Заполните все обязательные поля');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('purchases').insert({
        user_id: user!.id,
        name,
        price: Number(price),
        category,
        url: url || null,
        cooling_until: coolingInfo.until,
        status: 'pending',
      });

      if (error) throw error;

      onBack();
    } catch (error) {
      console.error('Error adding purchase:', error);
      alert('Ошибка при добавлении покупки');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Назад к списку
      </button>

      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
        <h2 className="text-2xl font-black text-white mb-6">Добавить покупку</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white font-bold mb-2">
              Название товара *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="iPhone 15 Pro"
              className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">
              Цена (₽) *
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="99990"
              className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">
              Категория *
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Электроника"
              className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">
              Ссылка на товар (опционально)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
            />
          </div>

          {warning && (
            <div className="bg-red-900/20 border-2 border-red-500 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{warning}</p>
            </div>
          )}

          {coolingInfo && (
            <div className="bg-[#FFDD2D]/10 border-2 border-[#FFDD2D] rounded-2xl p-4 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#FFDD2D] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#FFDD2D] font-bold">
                  Период охлаждения: {coolingInfo.days}{' '}
                  {coolingInfo.days === 1 ? 'день' : 'дней'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Вы сможете принять решение{' '}
                  {new Date(coolingInfo.until).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          {ranges.length === 0 && (
            <div className="bg-zinc-800 rounded-2xl p-4 text-gray-400 text-sm">
              Настройте диапазоны охлаждения в профиле для автоматического расчета
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !coolingInfo}
            className="w-full bg-[#FFDD2D] text-black font-black py-4 rounded-2xl hover:bg-[#FFE14D] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Добавляем...' : 'Добавить в список желаемого'}
          </button>
        </form>
      </div>
    </div>
  );
}
