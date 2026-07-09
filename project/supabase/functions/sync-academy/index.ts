import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  GraduationCap,
  Trophy,
  RefreshCw,
  Lock,
  Crown,
  Users,
  Plus,
  X,
  CreditCard as Edit2,
  Sparkles,
  Swords,
  TrendingUp,
  History,
  Calendar,
  ArrowLeft
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const STORAGE_KEY_SORT = 'vanta_academy_sort_mode';

type SortMode = 'progress' | 'trophies';

interface AcademyMember {
  id: string;
  name: string;
  tag: string;
  trophies: number;
  start_trophies: number;
  progress?: number;
  created_at?: string;
  updated_at?: string;
}

interface AcademySyncLog {
  id: string;
  sync_time: string;
  members_count: number;
  message?: string | null;
  sync_type?: string | null;
}

interface AcademyWeeklySnapshot {
  id: string;
  week_start?: string;
  week_date?: string;
  member_tag: string;
  member_name: string;
  start_trophies: number;
  end_trophies: number;
  progress: number;
  created_at?: string;
}

const ROLE_PATTERNS = [
  /^member(\s*\(\d+\))?$/i,
  /^senior(\s*\(\d+\))?$/i,
  /^president(\s*\(\d+\))?$/i,
  /^vice president(\s*\(\d+\))?$/i,
  /^elder(\s*\(\d+\))?$/i,
  /^leader(\s*\(\d+\))?$/i,
  /^co-leader(\s*\(\d+\))?$/i,
  /^left$/i,
];

function isRoleOrMeta(line: string): boolean {
  if (!line || line.startsWith('#')) return true;
  if (/^#?\d+$/.test(line)) return true;
  return ROLE_PATTERNS.some(re => re.test(line.trim()));
}

function normalizeTag(tag: string): string {
  const cleaned = tag.replace('#', '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return `#${cleaned}`;
}

function parseBrawlifyData(rawText: string): Array<{ name: string; tag: string; trophies: number }> {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const parsed: Array<{ name: string; tag: string; trophies: number }> = [];
  const seenTags = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#')) continue;

    const tag = normalizeTag(line);
    if (seenTags.has(tag)) continue;

    let name = '';
    for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
      const candidate = lines[j];
      if (isRoleOrMeta(candidate)) continue;
      name = candidate;
      break;
    }

    if (!name || name.toLowerCase() === 'unknown') continue;

    let trophies = 0;
    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      if (lines[j].toUpperCase() === 'TROPHIES') {
        for (let k = j + 1; k < Math.min(j + 4, lines.length); k++) {
          const num = parseInt(lines[k].replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > 1000 && num < 200000) {
            trophies = num;
            break;
          }
        }
      }
      if (trophies > 0) break;
    }

    if (trophies > 0) {
      seenTags.add(tag);
      parsed.push({ name, tag, trophies });
    }
  }

  return parsed;
}

export default function Academy() {
  const [members, setMembers] = useState<AcademyMember[]>([]);
  const [lastSync, setLastSync] = useState<AcademySyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>(() => (localStorage.getItem(STORAGE_KEY_SORT) as SortMode) || 'progress');
  const [showAdmin, setShowAdmin] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ tag: '', name: '', trophies: '' });
  const [editingMember, setEditingMember] = useState<AcademyMember | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<Record<string, AcademyWeeklySnapshot[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-academy`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Blad pobierania akademii');

      if (data.members) {
        const processed = data.members.map((m: AcademyMember) => ({
          ...m,
          progress: m.trophies - m.start_trophies
        }));
        setMembers(processed);
      }
      if (data.lastSync) setLastSync(data.lastSync);
    } catch (err) {
      console.error('Error fetching academy members:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('academy-members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'academy_members' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SORT, sortMode);
  }, [sortMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT';
      if (isTyping) return;

      if ((e.key === 'l' || e.key === 'L') && !showAdmin) {
        const entered = prompt('Podaj haslo Lidera Akademii:');
        if (entered === 'Tygrysek130@') {
          setShowAdmin(true);
        } else if (entered !== null) {
          alert('BLAD: Niepoprawne haslo. Brak dostepu.');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAdmin]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-academy?history=true`);
      const data = await response.json();
      if (data.history) setHistoryData(data.history);
    } catch (err) {
      console.error('Error fetching academy history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleSync = async (forceAdd = false) => {
    if (!rawInput.trim()) return;
    setSyncing(true);

    const parsed = parseBrawlifyData(rawInput);
    if (parsed.length === 0) {
      alert('Nie rozpoznano zadnych graczy. Upewnij sie, ze wklejono dane z Brawlify (tagi z #).');
      setSyncing(false);
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-academy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forceAdd ? { forceAdd: true, members: parsed } : { members: parsed })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Blad synchronizacji');

      alert(result.message || `Zaktualizowano ${parsed.length} graczy akademii.`);
      setRawInput('');
      fetchData();
    } catch (err) {
      console.error('Academy sync error:', err);
      alert('Wystapil blad podczas synchronizacji Akademii.');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.tag || !newMember.name || !newMember.trophies) return;
    setSyncing(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-academy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceAdd: true,
          members: [{
            tag: normalizeTag(newMember.tag),
            name: newMember.name,
            trophies: parseInt(newMember.trophies, 10)
          }]
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Blad dodawania gracza');

      setNewMember({ tag: '', name: '', trophies: '' });
      setShowAddMember(false);
      fetchData();
    } catch (err) {
      console.error('Add academy member error:', err);
      alert('Nie udalo sie dodac gracza Akademii.');
    } finally {
      setSyncing(false);
    }
  };

  const handleEditMember = async () => {
    if (!editingMember) return;
    setSyncing(true);

    try {
      const { error } = await supabase
        .from('academy_members')
        .update({
          name: editingMember.name,
          trophies: editingMember.trophies,
          start_trophies: editingMember.start_trophies,
          updated_at: new Date().toISOString()
        })
        .eq('tag', editingMember.tag);

      if (error) throw error;
      setEditingMember(null);
      fetchData();
    } catch (err) {
      console.error('Edit academy member error:', err);
      alert('Nie udalo sie zapisac zmian.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteMember = async (tag: string) => {
    if (!confirm('Na pewno usunac tego gracza z akademii?')) return;

    try {
      const { error } = await supabase.from('academy_members').delete().eq('tag', tag);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Delete academy member error:', err);
      alert('Nie udalo sie usunac gracza.');
    }
  };

  const handleResetWeek = async () => {
    if (!confirm('Zapisac start tygodnia? Aktualne pucharki stana sie nowym startem tygodnia, a obecny tydzien trafi do historii.')) return;
    setSyncing(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-academy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetWeek: true })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Blad resetowania tygodnia');

      alert(result.message || 'Start tygodnia zapisany dla Akademii.');
      fetchData();
    } catch (err) {
      console.error('Academy reset week error:', err);
      alert('Nie udalo sie zapisac startu tygodnia.');
    } finally {
      setSyncing(false);
    }
  };

  const sorted = [...members].sort((a, b) => {
    if (sortMode === 'progress') {
      const pa = a.trophies - a.start_trophies;
      const pb = b.trophies - b.start_trophies;
      if (pb !== pa) return pb - pa;
      return b.trophies - a.trophies;
    }
    return b.trophies - a.trophies;
  });

  const mvp = members.length > 0
    ? members.reduce((best, m) => (m.progress || 0) > (best.progress || 0) ? m : best, members[0])
    : null;
  const mvpProgress = mvp?.progress || 0;

  const weeksList = Object.keys(historyData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const openHistory = () => {
    setShowHistory(true);
    fetchHistory();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400 inline" />;
    if (rank === 2) return <Crown className="w-6 h-6 text-gray-400 inline" />;
    if (rank === 3) return <Crown className="w-6 h-6 text-amber-600 inline" />;
    return <span className="text-purple-400 font-bold">{rank}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl border border-cyan-500/40 bg-gradient-to-br from-[#0a1622] via-[#0b0713] to-[#120b24] p-6 shadow-[0_0_25px_rgba(0,255,204,0.15)]">
        <div className="absolute -top-8 -right-8 opacity-10">
          <GraduationCap className="w-40 h-40 text-cyan-400" />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Akademia Vanta
                </h1>
                <p className="text-xs text-cyan-300/70 tracking-wider">ROZWOJ PRZYSZLYCH WOJOWNIKOW VANTA CORE</p>
              </div>
            </div>
            <button
              onClick={openHistory}
              className="hidden sm:flex items-center gap-2 text-cyan-300 hover:text-white transition-colors text-sm"
            >
              <History className="w-4 h-4" />
              Historia
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2 text-cyan-300">
              <Swords className="w-4 h-4" />
              <span>Trening młodych zawodnikow</span>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <Sparkles className="w-4 h-4" />
              <span>Sciezka rozwoju do glownego klubu</span>
            </div>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setShowHistory(false)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Wroc
            </button>
            <div className="flex items-center gap-2 text-cyan-300">
              <History className="w-5 h-5" />
              <span className="font-bold text-lg">Historia Akademii</span>
            </div>
          </div>

          {historyLoading ? (
            <div className="text-center py-8 text-cyan-400">
              <RefreshCw className="w-6 h-6 animate-spin inline mr-2" />
              Ladowanie historii...
            </div>
          ) : weeksList.length === 0 ? (
            <div className="text-center py-8 text-white/30 border border-dashed border-cyan-600 rounded-lg">
              Brak zapisanych tygodni Akademii.
            </div>
          ) : (
            <div className="space-y-6">
              {weeksList.map(week => (
                <div key={week} className="bg-gradient-to-br from-[#120b24] to-[#080410] border border-cyan-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 text-cyan-400 font-bold">
                    <Calendar className="w-5 h-5" />
                    {new Date(week).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="grid gap-2">
                    {historyData[week]
                      .sort((a, b) => b.progress - a.progress)
                      .map((snap, idx) => (
                        <div key={snap.id} className="flex items-center justify-between bg-purple-900/20 rounded px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-cyan-400 font-bold w-6">{idx + 1}.</span>
                            <span className="font-bold">{snap.member_name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-purple-300">{snap.start_trophies.toLocaleString()}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-cyan-400">{snap.end_trophies.toLocaleString()}</span>
                            <span className={`font-bold w-16 text-right ${snap.progress >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {snap.progress >= 0 ? '+' : ''}{snap.progress}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!showHistory && (
        <>
          {mvp && mvpProgress > 0 && (
            <div className="bg-[rgba(0,255,204,0.05)] border-2 border-dashed border-cyan-500 rounded-lg p-4 text-center animate-pulse shadow-[0_0_15px_rgba(0,255,204,0.3)]">
              <div className="text-sm tracking-widest text-cyan-400 font-bold mb-1 drop-shadow-[0_0_5px_#00ffcc]">
                NAJWIEKSZY PUSH TYGODNIA - AKADEMIA
              </div>
              <div className="text-2xl font-bold text-cyan-300 drop-shadow-[0_0_8px_#00ffcc]">
                {mvp.name} (+{mvpProgress})
              </div>
            </div>
          )}

          {showAdmin && (
            <div className="bg-[rgba(20,12,38,0.85)] border border-dashed border-cyan-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3 text-cyan-300">
                <Lock className="w-4 h-4" />
                <span className="font-bold text-sm">Panel Lidera Akademii</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-all flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Dodaj gracza
                </button>
                <button
                  onClick={handleResetWeek}
                  disabled={syncing}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  Nowy tydzien
                </button>
              </div>

              {showAddMember && (
                <div className="bg-purple-900/30 p-3 rounded mb-4">
                  <div className="text-sm font-bold mb-2 text-cyan-300">Dodaj nowego gracza akademii:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Tag (#ABC123)"
                      value={newMember.tag}
                      onChange={e => setNewMember({ ...newMember, tag: e.target.value })}
                      className="bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      placeholder="Nazwa"
                      value={newMember.name}
                      onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                      className="bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      placeholder="Pucharki"
                      value={newMember.trophies}
                      onChange={e => setNewMember({ ...newMember, trophies: e.target.value })}
                      className="bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={!newMember.tag || !newMember.name || !newMember.trophies || syncing}
                    className="mt-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  >
                    Dodaj
                  </button>
                </div>
              )}

              <div className="bg-purple-900/30 p-3 rounded">
                <div className="text-sm font-bold mb-2 text-cyan-300">Wklej dane z Brawlify:</div>
                <textarea
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  placeholder="Wklej dane graczy akademii tutaj..."
                  rows={4}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded p-2 text-white placeholder-purple-400 focus:outline-none focus:border-cyan-500"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => handleSync(false)}
                    disabled={syncing || !rawInput.trim()}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  >
                    Aktualizuj / dodaj z Brawlify
                  </button>
                  <button
                    onClick={() => handleSync(true)}
                    disabled={syncing || !rawInput.trim()}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  >
                    Force add
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-purple-300">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{members.length} zawodnikow akademii</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">Sortuj:</span>
              <button
                onClick={() => setSortMode('progress')}
                className={`px-3 py-1 rounded transition-all flex items-center gap-1 ${sortMode === 'progress' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' : 'text-purple-300 hover:bg-purple-900/30'}`}
              >
                <TrendingUp className="w-3 h-3" />
                Progress
              </button>
              <button
                onClick={() => setSortMode('trophies')}
                className={`px-3 py-1 rounded transition-all flex items-center gap-1 ${sortMode === 'trophies' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' : 'text-purple-300 hover:bg-purple-900/30'}`}
              >
                <Trophy className="w-3 h-3" />
                Pucharki
              </button>
            </div>
          </div>

          {lastSync && (
            <div className="text-center text-xs text-cyan-400/60">
              Ostatnia aktualizacja Akademii: {new Date(lastSync.sync_time).toLocaleString('pl-PL')}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-cyan-400">
              <RefreshCw className="w-6 h-6 animate-spin inline mr-2" />
              Ladowanie Akademii...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-white/30 border border-dashed border-cyan-600 rounded-lg">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Brak zawodnikow w akademii</p>
              {showAdmin && <p className="text-sm mt-2">Dodaj graczy przez panel lidera</p>}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#120b24] to-[#080410] border-2 border-cyan-600 rounded-xl shadow-[0_0_25px_rgba(0,255,204,0.4)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b-2 border-cyan-600">
                      <th className="py-3 px-4 text-left text-cyan-400 font-bold">TOP</th>
                      <th className="py-3 px-4 text-left text-cyan-400 font-bold">Gracz</th>
                      <th className="py-3 px-4 text-left text-cyan-400 font-bold">Aktualne pucharki</th>
                      <th className="py-3 px-4 text-left text-cyan-400 font-bold">Start tygodnia</th>
                      <th className="py-3 px-4 text-left text-cyan-400 font-bold">Progress</th>
                      {showAdmin && <th className="py-3 px-4 text-left text-cyan-400 font-bold">Akcje</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((member, idx) => {
                      const progress = member.trophies - member.start_trophies;
                      return (
                        <tr key={member.id} className="border-b border-purple-900/30 hover:bg-cyan-900/10 transition-colors">
                          <td className="py-3 px-4">{getRankIcon(idx + 1)}</td>
                          <td className="py-3 px-4 font-bold">
                            <div>{member.name}</div>
                            <div className="text-xs text-purple-400 font-normal">{member.tag}</div>
                          </td>
                          <td className="py-3 px-4 text-cyan-400 font-bold">
                            <div className="flex items-center gap-1">
                              <Trophy className="w-4 h-4 text-yellow-400" />
                              {member.trophies.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-purple-400">{member.start_trophies.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className={`font-bold ${progress > 0 ? 'text-green-400' : progress < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              {progress > 0 ? '+' : ''}{progress}
                            </span>
                          </td>
                          {showAdmin && (
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingMember(member)}
                                  className="p-1.5 bg-purple-700 hover:bg-purple-600 rounded transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(member.tag)}
                                  className="p-1.5 bg-red-700 hover:bg-red-600 rounded transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {editingMember && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#120b24] border border-cyan-600 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edytuj gracza akademii</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-purple-300 block mb-1">Nazwa</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Aktualne pucharki</label>
                <input
                  type="number"
                  value={editingMember.trophies}
                  onChange={e => setEditingMember({ ...editingMember, trophies: parseInt(e.target.value) || 0 })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-purple-300 block mb-1">Start tygodnia</label>
                <input
                  type="number"
                  value={editingMember.start_trophies}
                  onChange={e => setEditingMember({ ...editingMember, start_trophies: parseInt(e.target.value) || 0 })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleEditMember}
                disabled={syncing}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded disabled:opacity-50"
              >
                Zapisz
              </button>
              <button
                onClick={() => setEditingMember(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-4 text-xs text-purple-500/50">
        Wcisnij 'L' aby otworzyc panel lidera akademii
      </div>
    </div>
  );
}
