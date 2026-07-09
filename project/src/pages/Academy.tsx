import { useState, useEffect } from 'react';
import { GraduationCap, Trophy, RefreshCw, Lock, Crown, Users, Plus, X, CreditCard as Edit2, Sparkles, Swords, TrendingUp } from 'lucide-react';

const STORAGE_KEY_LIST = 'vanta_academy_current_list';
const STORAGE_KEY_START = 'vanta_academy_start_data';
const STORAGE_KEY_SORT = 'vanta_academy_sort_mode';
const STORAGE_KEY_WEEK = 'vanta_academy_week_label';

interface AcademyMember {
  id: string;
  name: string;
  tag: string;
  trophies: number;
  startTrophies: number;
}

type SortMode = 'progress' | 'trophies';

function loadList(): AcademyMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadStart(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_START);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function parseBrawlifyData(rawText: string): Array<{ name: string; tag: string; trophies: number }> {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const parsed: Array<{ name: string; tag: string; trophies: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#')) continue;

    const tag = line.toUpperCase();
    let name = '';
    let trophies = 0;

    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const candidate = lines[j];
      const upper = candidate.toUpperCase();
      if (!candidate || candidate.startsWith('#')) continue;
      if (upper === 'LEFT' || upper === 'MEMBER' || upper === 'SENIOR' || upper === 'PRESIDENT' || upper === 'VICE PRESIDENT') continue;
      if (/^#?\d+$/.test(candidate)) continue;
      name = candidate;
      break;
    }

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

    if (name && trophies > 0) {
      parsed.push({ name, tag, trophies });
    }
  }
  return parsed;
}

export default function Academy() {
  const [members, setMembers] = useState<AcademyMember[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('progress');
  const [showAdmin, setShowAdmin] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ tag: '', name: '', trophies: '' });
  const [editingMember, setEditingMember] = useState<AcademyMember | null>(null);
  const [weekLabel, setWeekLabel] = useState('');

  useEffect(() => {
    const list = loadList();
    const start = loadStart();
    const withStart = list.map(m => ({
      ...m,
      startTrophies: start[m.tag] ?? m.trophies
    }));
    setMembers(withStart);
    const savedSort = (localStorage.getItem(STORAGE_KEY_SORT) as SortMode) || 'progress';
    setSortMode(savedSort);
    const savedWeek = localStorage.getItem(STORAGE_KEY_WEEK) || '';
    setWeekLabel(savedWeek);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SORT, sortMode);
  }, [sortMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WEEK, weekLabel);
  }, [weekLabel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const persistStartData = (list: AcademyMember[]) => {
    const startMap: Record<string, number> = {};
    list.forEach(m => { startMap[m.tag] = m.startTrophies; });
    localStorage.setItem(STORAGE_KEY_START, JSON.stringify(startMap));
  };

  const handleSync = (forceAdd = false) => {
    if (!rawInput.trim()) return;
    setSyncing(true);
    const parsed = parseBrawlifyData(rawInput);

    if (parsed.length === 0) {
      alert('Nie rozpoznano zadnych graczy. Upewnij sie, ze wklejono dane z Brawlify (tagi z #).');
      setSyncing(false);
      return;
    }

    setMembers(prev => {
      let next = [...prev];
      parsed.forEach(p => {
        const idx = next.findIndex(m => m.tag === p.tag);
        if (idx >= 0) {
          next[idx] = { ...next[idx], name: p.name, trophies: p.trophies };
        } else if (forceAdd) {
          next.push({
            id: crypto.randomUUID(),
            name: p.name,
            tag: p.tag,
            trophies: p.trophies,
            startTrophies: p.trophies
          });
        }
      });
      if (!forceAdd) {
        const knownTags = new Set(parsed.map(p => p.tag));
        next = next.filter(m => knownTags.has(m.tag) || prev.some(pm => pm.tag === m.tag && !knownTags.has(pm.tag)));
      }
      persistStartData(next);
      return next;
    });

    alert(`Zaktualizowano ${parsed.length} graczy akademii.`);
    setRawInput('');
    setSyncing(false);
  };

  const handleAddMember = () => {
    if (!newMember.tag || !newMember.name || !newMember.trophies) return;
    const tag = newMember.tag.startsWith('#') ? newMember.tag.toUpperCase() : `#${newMember.tag.toUpperCase()}`;
    if (members.some(m => m.tag === tag)) {
      alert('Gracz z tym tagiem juz istnieje w akademii.');
      return;
    }
    const trophies = parseInt(newMember.trophies) || 0;
    const member: AcademyMember = {
      id: crypto.randomUUID(),
      name: newMember.name,
      tag,
      trophies,
      startTrophies: trophies
    };
    const next = [...members, member];
    setMembers(next);
    persistStartData(next);
    setNewMember({ tag: '', name: '', trophies: '' });
    setShowAddMember(false);
  };

  const handleEditMember = () => {
    if (!editingMember) return;
    setMembers(prev => {
      const next = prev.map(m => m.id === editingMember.id ? { ...editingMember } : m);
      persistStartData(next);
      return next;
    });
    setEditingMember(null);
  };

  const handleDeleteMember = (id: string) => {
    if (!confirm('Na pewno usunac tego gracza z akademii?')) return;
    setMembers(prev => {
      const next = prev.filter(m => m.id !== id);
      persistStartData(next);
      return next;
    });
  };

  const handleResetWeek = () => {
    if (!confirm('Zapisac start tygodnia? Aktualne pucharki stanie sie startem tygodnia.')) return;
    setMembers(prev => {
      const next = prev.map(m => ({ ...m, startTrophies: m.trophies }));
      persistStartData(next);
      return next;
    });
    const today = new Date().toLocaleDateString('pl-PL');
    setWeekLabel(today);
    alert('Start tygodnia zapisany dla akademii.');
  };

  const sorted = [...members].sort((a, b) => {
    if (sortMode === 'progress') {
      const pa = a.trophies - a.startTrophies;
      const pb = b.trophies - b.startTrophies;
      if (pb !== pa) return pb - pa;
      return b.trophies - a.trophies;
    }
    return b.trophies - a.trophies;
  });

  const mvp = members.length > 0
    ? members.reduce((best, m) => {
        const p = m.trophies - m.startTrophies;
        return p > (best.trophies - best.startTrophies) ? m : best;
      }, members[0])
    : null;
  const mvpProgress = mvp ? mvp.trophies - mvp.startTrophies : 0;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400 inline" />;
    if (rank === 2) return <Crown className="w-6 h-6 text-gray-400 inline" />;
    if (rank === 3) return <Crown className="w-6 h-6 text-amber-600 inline" />;
    return <span className="text-purple-400 font-bold">{rank}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Training-themed header */}
      <div className="relative overflow-hidden rounded-xl border border-cyan-500/40 bg-gradient-to-br from-[#0a1622] via-[#0b0713] to-[#120b24] p-6 shadow-[0_0_25px_rgba(0,255,204,0.15)]">
        <div className="absolute -top-8 -right-8 opacity-10">
          <GraduationCap className="w-40 h-40 text-cyan-400" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
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

      {/* MVP of the week */}
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

      {/* Admin panel */}
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
              <RefreshCw className="w-4 h-4" />
              Zapisz start tygodnia
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
                disabled={!newMember.tag || !newMember.name || !newMember.trophies}
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
                Aktualizuj (tylko w bazie)
              </button>
              <button
                onClick={() => handleSync(true)}
                disabled={syncing || !rawInput.trim()}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                Dodaj nowe (force)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort toggle + info */}
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

      {weekLabel && (
        <div className="text-center text-xs text-cyan-400/60">
          Start tygodnia akademii: {weekLabel}
        </div>
      )}

      {/* Ranking table */}
      {members.length === 0 ? (
        <div className="text-center py-12 text-white/30 border border-dashed border-cyan-600 rounded-lg">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Brak zawodnikow w akademii</p>
          {showAdmin && <p className="text-sm mt-2">Dodaj graczy przez panel lidera (wcisnij 'L')</p>}
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
                  const progress = member.trophies - member.startTrophies;
                  return (
                    <tr key={member.id} className="border-b border-purple-900/30 hover:bg-cyan-900/10 transition-colors">
                      <td className="py-3 px-4">{getRankIcon(idx + 1)}</td>
                      <td className="py-3 px-4 font-bold">{member.name}</td>
                      <td className="py-3 px-4 text-cyan-400 font-bold">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          {member.trophies.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-purple-400">{member.startTrophies.toLocaleString()}</td>
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
                              onClick={() => handleDeleteMember(member.id)}
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

      {/* Edit Modal */}
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
                  value={editingMember.startTrophies}
                  onChange={e => setEditingMember({ ...editingMember, startTrophies: parseInt(e.target.value) || 0 })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleEditMember}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded"
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
