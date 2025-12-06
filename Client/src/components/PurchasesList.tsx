import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import { Plus, Check, X, Clock, ExternalLink } from 'lucide-react';

interface Purchase {
  id: string;
  name: string;
  price: number;
  category: string;
  url: string | null;
  cooling_until: string;
  status: string;
  created_at: string;
}

export default function PurchasesList({ onAddPurchase }: { onAddPurchase: () => void }) {
  const { user } = useUser();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPurchases();
    }
  }, [user]);

  const loadPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user!.id)
        .in('status', ['pending', 'cooled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const completePurchase = async (purchase: Purchase, action: 'purchased' | 'cancelled') => {
    try {
      await supabase
        .from('purchases')
        .update({
          status: action,
          completed_at: new Date().toISOString(),
        })
        .eq('id', purchase.id);

      await supabase.from('purchase_history').insert({
        user_id: user!.id,
        purchase_id: purchase.id,
        action,
      });

      loadPurchases();
    } catch (error) {
      console.error('Error completing purchase:', error);
      alert('Ошибка при обновлении покупки');
    }
  };

  const getDaysRemaining = (coolingUntil: string) => {
    const now = new Date();
    const until = new Date(coolingUntil);
    const diff = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const isCooled = (coolingUntil: string) => {
    return new Date(coolingUntil) <= new Date();
  };

  if (loading) {
    return <div className="text-white">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white">Желаемые покупки</h2>
        <button
          onClick={onAddPurchase}
          className="bg-[#FFDD2D] text-black font-black px-6 py-3 rounded-2xl hover:bg-[#FFE14D] transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить
        </button>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-zinc-900 rounded-3xl p-12 text-center border border-zinc-800">
          <div className="text-gray-400 text-lg mb-4">
            У вас пока нет желаемых покупок
          </div>
          <button
            onClick={onAddPurchase}
            className="bg-[#FFDD2D] text-black font-black px-8 py-4 rounded-2xl hover:bg-[#FFE14D] transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Добавить первую покупку
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {purchases.map((purchase) => {
            const daysLeft = getDaysRemaining(purchase.cooling_until);
            const cooled = isCooled(purchase.cooling_until);

            return (
              <div
                key={purchase.id}
                className={`bg-zinc-900 rounded-3xl p-6 border-2 transition-all ${
                  cooled
                    ? 'border-[#FFDD2D] shadow-lg shadow-[#FFDD2D]/20'
                    : 'border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{purchase.name}</h3>
                      {purchase.url && (
                        <a
                          href={purchase.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FFDD2D] hover:text-[#FFE14D] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-gray-400 mb-3">
                      <span className="text-2xl font-black text-white">
                        {purchase.price.toLocaleString('ru-RU')} ₽
                      </span>
                      <span className="bg-zinc-800 px-3 py-1 rounded-xl text-sm">
                        {purchase.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {cooled ? (
                        <div className="flex items-center gap-2 text-[#FFDD2D] font-bold">
                          <Check className="w-5 h-5" />
                          Период охлаждения завершен!
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-5 h-5" />
                          <span>
                            {daysLeft > 0
                              ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : 'дней'}`
                              : 'Сегодня последний день!'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => completePurchase(purchase, 'purchased')}
                      className="bg-[#FFDD2D] text-black p-3 rounded-2xl hover:bg-[#FFE14D] transition-all"
                      title="Купил"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => completePurchase(purchase, 'cancelled')}
                      className="bg-zinc-800 text-white p-3 rounded-2xl hover:bg-zinc-700 transition-all"
                      title="Отказаться"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
