import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, Bell } from 'lucide-react';

interface NotificationSettings {
  frequency: string;
  channel: string;
  enabled: boolean;
  exclude_categories: string[];
}

export default function SettingsPage() {
  const { user } = useUser();
  const [blacklist, setBlacklist] = useState<{ id: string; category_name: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    frequency: 'weekly',
    channel: 'app',
    enabled: true,
    exclude_categories: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadBlacklist();
      loadNotificationSettings();
    }
  }, [user]);

  const loadBlacklist = async () => {
    try {
      const { data, error } = await supabase
        .from('categories_blacklist')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at');

      if (error) throw error;
      setBlacklist(data || []);
    } catch (error) {
      console.error('Error loading blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNotifSettings({
          frequency: data.frequency,
          channel: data.channel,
          enabled: data.enabled,
          exclude_categories: data.exclude_categories || [],
        });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const { error } = await supabase.from('categories_blacklist').insert({
        user_id: user!.id,
        category_name: newCategory.trim(),
      });

      if (error) throw error;

      setNewCategory('');
      loadBlacklist();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Ошибка при добавлении категории');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories_blacklist')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadBlacklist();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({
          frequency: notifSettings.frequency,
          channel: notifSettings.channel,
          enabled: notifSettings.enabled,
          exclude_categories: notifSettings.exclude_categories,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user!.id);

      if (error) throw error;
      alert('Настройки сохранены!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const toggleExcludeCategory = (category: string) => {
    const newExclude = notifSettings.exclude_categories.includes(category)
      ? notifSettings.exclude_categories.filter((c) => c !== category)
      : [...notifSettings.exclude_categories, category];

    setNotifSettings({ ...notifSettings, exclude_categories: newExclude });
  };

  if (loading) {
    return <div className="text-white">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
        <h2 className="text-2xl font-black text-white mb-6">Черный список категорий</h2>

        <div className="space-y-4 mb-6">
          {blacklist.map((item) => (
            <div
              key={item.id}
              className="bg-black rounded-2xl p-4 flex items-center justify-between"
            >
              <span className="text-white font-bold">{item.category_name}</span>
              <button
                onClick={() => deleteCategory(item.id)}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            </div>
          ))}

          {blacklist.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Черный список пуст
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
            placeholder="Название категории"
            className="flex-1 px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
          />
          <button
            onClick={addCategory}
            className="bg-[#FFDD2D] text-black font-black px-6 py-3 rounded-2xl hover:bg-[#FFE14D] transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Добавить
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-[#FFDD2D]" />
          <h2 className="text-2xl font-black text-white">Настройки уведомлений</h2>
        </div>

        <div className="space-y-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifSettings.enabled}
              onChange={(e) =>
                setNotifSettings({ ...notifSettings, enabled: e.target.checked })
              }
              className="w-5 h-5 rounded border-2 border-zinc-700 text-[#FFDD2D] focus:ring-[#FFDD2D]"
            />
            <span className="text-white font-bold">Включить уведомления</span>
          </label>

          <div>
            <label className="block text-white font-bold mb-2">
              Частота уведомлений
            </label>
            <select
              value={notifSettings.frequency}
              onChange={(e) =>
                setNotifSettings({ ...notifSettings, frequency: e.target.value })
              }
              className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
            >
              <option value="daily">Раз в день</option>
              <option value="weekly">Раз в неделю</option>
              <option value="monthly">Раз в месяц</option>
            </select>
          </div>

          <div>
            <label className="block text-white font-bold mb-2">
              Канал уведомлений
            </label>
            <select
              value={notifSettings.channel}
              onChange={(e) =>
                setNotifSettings({ ...notifSettings, channel: e.target.value })
              }
              className="w-full px-4 py-3 bg-black text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none"
            >
              <option value="app">В приложении</option>
              <option value="email">Email (скоро)</option>
              <option value="telegram">Telegram (скоро)</option>
            </select>
          </div>

          {blacklist.length > 0 && (
            <div>
              <label className="block text-white font-bold mb-3">
                Исключить категории из уведомлений
              </label>
              <div className="space-y-2">
                {blacklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 cursor-pointer bg-black rounded-2xl p-3"
                  >
                    <input
                      type="checkbox"
                      checked={notifSettings.exclude_categories.includes(
                        item.category_name
                      )}
                      onChange={() => toggleExcludeCategory(item.category_name)}
                      className="w-5 h-5 rounded border-2 border-zinc-700 text-[#FFDD2D] focus:ring-[#FFDD2D]"
                    />
                    <span className="text-white">{item.category_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={saveNotificationSettings}
            disabled={saving}
            className="w-full bg-[#FFDD2D] text-black font-black py-3 rounded-2xl hover:bg-[#FFE14D] transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохраняем...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>
  );
}
