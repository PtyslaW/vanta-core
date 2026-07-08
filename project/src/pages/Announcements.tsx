import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Mail, Plus, X, Edit2, Pin, Trash2, Lock } from 'lucide-react';
import type { Announcement } from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', pinned: false });

  useEffect(() => {
    fetchAnnouncements();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'l' || e.key === 'L') && !showAdmin) {
        const entered = prompt('Podaj haslo Lidera:');
        if (entered === 'Tygrysek130@') {
          setShowAdmin(true);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAdmin]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.title || !form.content) return;

    const { error } = await supabase.from('announcements').insert({
      title: form.title,
      content: form.content,
      pinned: form.pinned,
      author: 'Lider'
    });

    if (!error) {
      setForm({ title: '', content: '', pinned: false });
      setShowAdd(false);
      fetchAnnouncements();
    }
  };

  const handleEdit = async () => {
    if (!editing) return;

    const { error } = await supabase
      .from('announcements')
      .update({ title: editing.title, content: editing.content, pinned: editing.pinned })
      .eq('id', editing.id);

    if (!error) {
      setEditing(null);
      fetchAnnouncements();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Na pewno usunac ogloszenie?')) return;

    await supabase.from('announcements').delete().eq('id', id);
    fetchAnnouncements();
  };

  const togglePin = async (announcement: Announcement) => {
    await supabase
      .from('announcements')
      .update({ pinned: !announcement.pinned })
      .eq('id', announcement.id);
    fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-pink-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Ogloszenia Klubu
          </h1>
        </div>
        {showAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition-all"
          >
            <Plus className="w-4 h-4" />
            Nowe ogloszenie
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-purple-400">Ladowanie...</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-white/30 border border-dashed border-purple-600 rounded-lg">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Brak ogloszen</p>
          {showAdmin && <p className="text-sm mt-2">Kliknij "Nowe ogloszenie" aby dodac</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(announcement => (
            <div
              key={announcement.id}
              className={`bg-gradient-to-br from-[#120b24] to-[#080410] border rounded-lg p-5 ${
                announcement.pinned
                  ? 'border-pink-500 shadow-[0_0_15px_rgba(255,0,127,0.2)]'
                  : 'border-purple-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.pinned && (
                      <Pin className="w-4 h-4 text-pink-400" />
                    )}
                    <h3 className="font-bold text-lg">{announcement.title}</h3>
                  </div>
                  <p className="text-purple-200 whitespace-pre-wrap">{announcement.content}</p>
                  <div className="text-xs text-purple-400/60 mt-3">
                    {announcement.author} • {new Date(announcement.created_at).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                {showAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePin(announcement)}
                      className={`p-2 rounded transition-colors ${
                        announcement.pinned
                          ? 'bg-pink-600/20 text-pink-400'
                          : 'bg-purple-700/50 text-purple-300 hover:bg-purple-600/50'
                      }`}
                      title={announcement.pinned ? 'Odepnij' : 'Przypnij'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditing(announcement)}
                      className="p-2 bg-purple-700/50 hover:bg-purple-600/50 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 bg-red-700/50 hover:bg-red-600/50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#120b24] border border-purple-600 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">Nowe ogloszenie</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-purple-300 block mb-1">Tytul</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                  placeholder="Np. Nowy konkurs pushowy!"
                />
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Tresc</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  rows={5}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white resize-none"
                  placeholder="Opisz ogloszenie..."
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm({ ...form, pinned: e.target.checked })}
                  className="w-4 h-4 rounded border-purple-600 bg-purple-900/50 text-pink-500 focus:ring-pink-500"
                />
                <span className="text-sm text-purple-300">Przypiete ogloszenie (na gorze)</span>
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdd}
                disabled={!form.title || !form.content}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded disabled:opacity-50"
              >
                Dodaj
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#120b24] border border-purple-600 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">Edytuj ogloszenie</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-purple-300 block mb-1">Tytul</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Tresc</label>
                <textarea
                  value={editing.content}
                  onChange={e => setEditing({ ...editing, content: e.target.value })}
                  rows={5}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.pinned}
                  onChange={e => setEditing({ ...editing, pinned: e.target.checked })}
                  className="w-4 h-4 rounded border-purple-600 bg-purple-900/50 text-pink-500 focus:ring-pink-500"
                />
                <span className="text-sm text-purple-300">Przypiete</span>
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleEdit}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded"
              >
                Zapisz
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-4 text-xs text-purple-500/50">
        Wcisnij 'L' aby otworzyc panel lidera
      </div>
    </div>
  );
}
