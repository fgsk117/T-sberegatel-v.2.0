import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface HistoryItem {
  id: string;
  action: string;
  notes: string | null;
  created_at: string;
  purchase: {
    name: string;
    price: number;
    category: string;
    url: string | null;
  } | null;
}

export default function PurchaseHistory() {
  const { user } = useUser();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'purchased' | 'cancelled'>('all');

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const { data: historyData, error } = await supabase
        .from('purchase_history')
        .select(`
          id,
          action,
          notes,
          created_at,
          purchase_id
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const purchaseIds = historyData
        ?.map((h) => h.purchase_id)
        .filter((id): id is string => id !== null) || [];

      let purchases: any[] = [];
      if (purchaseIds.length > 0) {
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('id, name, price, category, url')
          .in('id', purchaseIds);

        purchases = purchasesData || [];
      }

      const enrichedHistory = historyData?.map((item) => ({
        ...item,
        purchase: item.purchase_id
          ? purchases.find((p) => p.id === item.purchase_id) || null
          : null,
      })) || [];

      setHistory(enrichedHistory);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    if (filter === 'all') return true;
    return item.action === filter;
  });

  const getTotalSpent = () => {
    return history
      .filter((item) => item.action === 'purchased' && item.purchase)
      .reduce((sum, item) => sum + (item.purchase?.price || 0), 0);
  };

  const getTotalSaved = () => {
    return history
      .filter((item) => item.action === 'cancelled' && item.purchase)
      .reduce((sum, item) => sum + (item.purchase?.price || 0), 0);
  };

  if (loading) {
    return <div className="text-white">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-white">История покупок</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <span className="text-gray-400">Куплено</span>
          </div>
          <div className="text-3xl font-black text-white">
            {getTotalSpent().toLocaleString('ru-RU')} ₽
          </div>
        </div>

        <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-6 h-6 text-red-400" />
            <span className="text-gray-400">Сэкономлено</span>
          </div>
          <div className="text-3xl font-black text-white">
            {getTotalSaved().toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            filter === 'all'
              ? 'bg-[#FFDD2D] text-black'
              : 'bg-zinc-900 text-white hover:bg-zinc-800'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => setFilter('purchased')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            filter === 'purchased'
              ? 'bg-[#FFDD2D] text-black'
              : 'bg-zinc-900 text-white hover:bg-zinc-800'
          }`}
        >
          Куплено
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            filter === 'cancelled'
              ? 'bg-[#FFDD2D] text-black'
              : 'bg-zinc-900 text-white hover:bg-zinc-800'
          }`}
        >
          Отменено
        </button>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="bg-zinc-900 rounded-3xl p-12 text-center border border-zinc-800">
          <div className="text-gray-400 text-lg">История пуста</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {item.action === 'purchased' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span
                      className={`font-bold ${
                        item.action === 'purchased'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {item.action === 'purchased' ? 'Купил' : 'Отказался'}
                    </span>
                    <span className="text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {item.purchase && (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">
                          {item.purchase.name}
                        </h3>
                        {item.purchase.url && (
                          <a
                            href={item.purchase.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FFDD2D] hover:text-[#FFE14D] transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-gray-400">
                        <span className="text-xl font-bold text-white">
                          {item.purchase.price.toLocaleString('ru-RU')} ₽
                        </span>
                        <span className="bg-zinc-800 px-3 py-1 rounded-xl text-sm">
                          {item.purchase.category}
                        </span>
                      </div>
                    </>
                  )}

                  {item.notes && (
                    <p className="text-gray-400 mt-2">{item.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
