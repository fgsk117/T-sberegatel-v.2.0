import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, ArrowLeft } from 'lucide-react';

interface AIPrompt {
  id: string;
  name: string;
  prompt_text: string;
  description: string | null;
}

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('name');

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrompt = async (id: string, promptText: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({
          prompt_text: promptText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      alert('Промпт обновлен!');
      loadPrompts();
    } catch (error) {
      console.error('Error updating prompt:', error);
      alert('Ошибка при обновлении');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-white">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Назад
      </button>

      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
        <h2 className="text-2xl font-black text-white mb-6">Админ панель - AI промпты</h2>

        <div className="space-y-6">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="bg-black rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{prompt.name}</h3>
                {prompt.description && (
                  <p className="text-gray-400 text-sm">{prompt.description}</p>
                )}
              </div>

              <div>
                <label className="block text-white font-bold mb-2">
                  Текст промпта
                </label>
                <textarea
                  value={prompt.prompt_text}
                  onChange={(e) => {
                    const updated = prompts.map((p) =>
                      p.id === prompt.id ? { ...p, prompt_text: e.target.value } : p
                    );
                    setPrompts(updated);
                  }}
                  rows={6}
                  className="w-full px-4 py-3 bg-zinc-900 text-white rounded-2xl border-2 border-zinc-700 focus:border-[#FFDD2D] focus:outline-none font-mono text-sm"
                />
              </div>

              <button
                onClick={() => updatePrompt(prompt.id, prompt.prompt_text)}
                disabled={saving}
                className="bg-[#FFDD2D] text-black font-black px-6 py-3 rounded-2xl hover:bg-[#FFE14D] transition-all flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Сохраняем...' : 'Сохранить промпт'}
              </button>
            </div>
          ))}

          {prompts.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Нет настроенных промптов
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-800 rounded-2xl p-6">
        <h3 className="text-white font-bold mb-2">О панели</h3>
        <p className="text-gray-400 text-sm">
          Здесь вы можете настроить промпты для AI-компонента, который анализирует
          схожесть категорий товаров с черным списком. Измените текст промпта,
          чтобы улучшить качество анализа.
        </p>
      </div>
    </div>
  );
}
