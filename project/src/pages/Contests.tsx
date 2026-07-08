import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar, Trophy, Plus, X, Edit2, Trash2, Users, Clock, Gift, Award, Lock } from 'lucide-react';
import type { Contest, ContestParticipant } from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Contests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [participants, setParticipants] = useState<Record<string, ContestParticipant[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Contest | null>(null);
  const [expandedContest, setExpandedContest] = useState<string | null>(null);
  const [joinForm, setJoinForm] = useState({ playerTag: '', playerName: '' });
  const [form, setForm] = useState({
    title: '',
    description: '',
    reward: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    rules: '',
    status: 'active' as 'active' | 'completed' | 'cancelled'
  });

  useEffect(() => {
    fetchContests();

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

  const fetchContests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setContests(data);

      // Fetch participants for each contest
      const partsData: Record<string, ContestParticipant[]> = {};
      for (const contest of data) {
        const { data: parts } = await supabase
          .from('contest_participants')
          .select('*')
          .eq('contest_id', contest.id)
          .order('score', { ascending: false });
        partsData[contest.id] = parts || [];
      }
      setParticipants(partsData);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.title || !form.description || !form.reward) return;

    const { error } = await supabase.from('contests').insert({
      title: form.title,
      description: form.description,
      reward: form.reward,
      start_date: form.start_date,
      end_date: form.end_date || null,
      rules: form.rules || null,
      status: form.status
    });

    if (!error) {
      setForm({
        title: '',
        description: '',
        reward: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        rules: '',
        status: 'active'
      });
      setShowAdd(false);
      fetchContests();
    }
  };

  const handleEdit = async () => {
    if (!editing) return;

    const { error } = await supabase
      .from('contests')
      .update({
        title: editing.title,
        description: editing.description,
        reward: editing.reward,
        start_date: editing.start_date,
        end_date: editing.end_date,
        rules: editing.rules,
        status: editing.status
      })
      .eq('id', editing.id);

    if (!error) {
      setEditing(null);
      fetchContests();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Na pewno usunac konkurs? Usunie tez wszystkich uczestnikow.')) return;

    await supabase.from('contests').delete().eq('id', id);
    fetchContests();
  };

  const handleJoin = async (contestId: string) => {
    if (!joinForm.playerTag || !joinForm.playerName) return;

    const normalizedTag = joinForm.playerTag.startsWith('#')
      ? joinForm.playerTag
      : `#${joinForm.playerTag}`;

    const { error } = await supabase.from('contest_participants').insert({
      contest_id: contestId,
      player_tag: normalizedTag,
      player_name: joinForm.playerName,
      score: 0
    });

    if (!error) {
      setJoinForm({ playerTag: '', playerName: '' });
      fetchContests();
    } else {
      alert('Blad: Juz jestes zapisany do tego konkursu!');
    }
  };

  const updateScore = async (participantId: string, newScore: number) => {
    await supabase
      .from('contest_participants')
      .update({ score: newScore })
      .eq('id', participantId);
    fetchContests();
  };

  const removeParticipant = async (participantId: string) => {
    if (!confirm('Usunac uczestnika?')) return;
    await supabase.from('contest_participants').delete().eq('id', participantId);
    fetchContests();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/30 border-green-500/50';
      case 'completed': return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
      case 'cancelled': return 'text-red-400 bg-red-900/30 border-red-500/50';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'AKTYWNY';
      case 'completed': return 'ZAKONCZONY';
      case 'cancelled': return 'ANULOWANY';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-pink-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Konkursy Klubu
          </h1>
        </div>
        {showAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition-all"
          >
            <Plus className="w-4 h-4" />
            Nowy konkurs
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-purple-400">Ladowanie...</div>
      ) : contests.length === 0 ? (
        <div className="text-center py-12 text-white/30 border border-dashed border-purple-600 rounded-lg">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Brak konkursow</p>
          {showAdmin && <p className="text-sm mt-2">Kliknij "Nowy konkurs" aby dodac</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {contests.map(contest => {
            const parts = participants[contest.id] || [];
            const isExpanded = expandedContest === contest.id;

            return (
              <div
                key={contest.id}
                className="bg-gradient-to-br from-[#120b24] to-[#080410] border border-purple-600 rounded-lg overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-purple-900/20 transition-colors"
                  onClick={() => setExpandedContest(isExpanded ? null : contest.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(contest.status)}`}>
                          {getStatusLabel(contest.status)}
                        </span>
                        <h3 className="font-bold text-lg">{contest.title}</h3>
                      </div>
                      <p className="text-purple-200 text-sm mb-3">{contest.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Gift className="w-4 h-4" />
                          <span>{contest.reward}</span>
                        </div>
                        <div className="flex items-center gap-1 text-purple-300">
                          <Users className="w-4 h-4" />
                          <span>{parts.length} uczestnikow</span>
                        </div>
                        <div className="flex items-center gap-1 text-purple-400">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(contest.start_date).toLocaleDateString('pl-PL')}
                            {contest.end_date && ` - ${new Date(contest.end_date).toLocaleDateString('pl-PL')}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {showAdmin && (
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setEditing(contest)}
                          className="p-2 bg-purple-700/50 hover:bg-purple-600/50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contest.id)}
                          className="p-2 bg-red-700/50 hover:bg-red-600/50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-purple-700 p-5 bg-purple-950/30">
                    {contest.rules && (
                      <div className="mb-4">
                        <div className="text-sm font-bold text-purple-400 mb-1">Zasady:</div>
                        <p className="text-purple-200 whitespace-pre-wrap text-sm">{contest.rules}</p>
                      </div>
                    )}

                    {/* Join Form */}
                    {contest.status === 'active' && (
                      <div className="bg-purple-900/30 rounded-lg p-4 mb-4">
                        <div className="text-sm font-bold text-purple-400 mb-2">Dolacz do konkursu:</div>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            placeholder="Tag gracza (#ABC123)"
                            value={joinForm.playerTag}
                            onChange={e => setJoinForm({ ...joinForm, playerTag: e.target.value })}
                            className="bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white placeholder-purple-400 text-sm flex-1 min-w-[140px]"
                          />
                          <input
                            type="text"
                            placeholder="Nazwa gracza"
                            value={joinForm.playerName}
                            onChange={e => setJoinForm({ ...joinForm, playerName: e.target.value })}
                            className="bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white placeholder-purple-400 text-sm flex-1 min-w-[140px]"
                          />
                          <button
                            onClick={() => handleJoin(contest.id)}
                            disabled={!joinForm.playerTag || !joinForm.playerName}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50 text-sm"
                          >
            Dolacz
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Leaderboard */}
                    {parts.length > 0 && (
                      <div>
                        <div className="text-sm font-bold text-purple-400 mb-2">Ranking uczestnikow:</div>
                        <div className="space-y-2">
                          {parts.map((p, idx) => (
                            <div key={p.id} className="flex items-center justify-between bg-purple-900/20 rounded px-3 py-2">
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                                  idx === 0 ? 'bg-yellow-500/30 text-yellow-400' :
                                  idx === 1 ? 'bg-gray-400/30 text-gray-300' :
                                  idx === 2 ? 'bg-amber-600/30 text-amber-500' :
                                  'bg-purple-700/30 text-purple-400'
                                }`}>
                                  {idx < 3 ? <Award className="w-4 h-4" /> : idx + 1}
                                </span>
                                <span className="font-medium">{p.player_name}</span>
                                <span className="text-xs text-purple-400">{p.player_tag}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {showAdmin ? (
                                  <>
                                    <input
                                      type="number"
                                      value={p.score}
                                      onChange={e => updateScore(p.id, parseInt(e.target.value) || 0)}
                                      className="w-20 bg-purple-900/50 border border-purple-600 rounded px-2 py-1 text-white text-right text-sm"
                                    />
                                    <button
                                      onClick={() => removeParticipant(p.id)}
                                      className="p-1 bg-red-700/50 hover:bg-red-600/50 rounded transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-cyan-400 font-bold">{p.score} pkt</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {parts.length === 0 && (
                      <div className="text-center text-purple-400/50 py-4">
                        Brak uczestnikow
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#120b24] border border-purple-600 rounded-lg p-6 w-full max-w-lg my-4">
            <h3 className="text-lg font-bold mb-4">Nowy konkurs</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-purple-300 block mb-1">Tytul *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                  placeholder="Np. Push Trophy Weekend"
                />
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Opis *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white resize-none"
                  placeholder="Opisz konkurs..."
                />
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Nagroda *</label>
                <input
                  type="text"
                  value={form.reward}
                  onChange={e => setForm({ ...form, reward: e.target.value })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                  placeholder="Np. 100 gemow, rzadki skin, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-purple-300 block mb-1">Start</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-purple-300 block mb-1">Koniec (opcjonalnie)</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Zasady (opcjonalnie)</label>
                <textarea
                  value={form.rules}
                  onChange={e => setForm({ ...form, rules: e.target.value })}
                  rows={3}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white resize-none"
                  placeholder="Zasady konkursu..."
                />
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as any })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                >
                  <option value="active">Aktywny</option>
                  <option value="completed">Zakonczony</option>
                  <option value="cancelled">Anulowany</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdd}
                disabled={!form.title || !form.description || !form.reward}
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#120b24] border border-purple-600 rounded-lg p-6 w-full max-w-lg my-4">
            <h3 className="text-lg font-bold mb-4">Edytuj konkurs</h3>
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
                <label className="text-sm text-purple-300 block mb-1">Opis</label>
                <textarea
                  value={editing.description}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white resize-none"
                />
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Nagroda</label>
                <input
                  type="text"
                  value={editing.reward}
                  onChange={e => setEditing({ ...editing, reward: e.target.value })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-purple-300 block mb-1">Start</label>
                  <input
                    type="date"
                    value={editing.start_date}
                    onChange={e => setEditing({ ...editing, start_date: e.target.value })}
                    className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-purple-300 block mb-1">Koniec</label>
                  <input
                    type="date"
                    value={editing.end_date || ''}
                    onChange={e => setEditing({ ...editing, end_date: e.target.value || null })}
                    className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Zasady</label>
                <textarea
                  value={editing.rules || ''}
                  onChange={e => setEditing({ ...editing, rules: e.target.value || null })}
                  rows={2}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white resize-none"
                />
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Status</label>
                <select
                  value={editing.status}
                  onChange={e => setEditing({ ...editing, status: e.target.value as any })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                >
                  <option value="active">Aktywny</option>
                  <option value="completed">Zakonczony</option>
                  <option value="cancelled">Anulowany</option>
                </select>
              </div>
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
