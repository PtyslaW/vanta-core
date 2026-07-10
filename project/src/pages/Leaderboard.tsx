import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Trophy, RefreshCw, Lock, Crown, TrendingUp, Users, Clock, Plus, X, Edit2, History, Calendar, ArrowLeft } from 'lucide-react';
import type { Member, SyncLog, WeeklySnapshot } from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const CLUB_TAG_KEY = 'vanta_club_tag';
const DEFAULT_CLUB_TAG = '#82YPLP99U';

const TRUSTED_TAGS = [
  "8RRCQ0YLJ",
  "P02R0LPJ9",
  "222VPGGVJ",
  "YJ000C09Y",
  "PQ088PCLU",
  "9J8VYR92Y",
  "2LL8VLL0R",
  "Y0CLVL9U0",
  "PP8CGVLG9",
  "Q9PV20CCJ",
  "9J0UGQQCC",
  "VCPLV829",
  "Q0P8GGLG0",
  "80L9RRUUU",
  "9LUJR0G0",
  "UYV0Q90V",
  "2CQUC9PQRP",
  "P0CJVJC2V",
  "QR0LQJ0V0",
  "LPYGVVQL8",
  "20R8UPJVJ",
  "Q9U9GJYQL",
  "GC0RPJLU2",
  "LGVPYL0CU",
  "2JQJ8L2P82",
  "G9PV29R22",
  "228YQ2YCC",
  "GG0C92VJQ",
  "8RL22C8VY",
  "9JU92LJLC",
  "92C2JC0LL",
  "9LPGPRG9J"
];

interface Props {
  mode: 'home' | 'full';
}

export default function Leaderboard({ mode }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [clubTag, setClubTag] = useState(localStorage.getItem(CLUB_TAG_KEY) || DEFAULT_CLUB_TAG);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ tag: '', name: '', trophies: '' });
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<Record<string, WeeklySnapshot[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-club`);
      const data = await response.json();
      if (data.members) {
        const processed = data.members.map((m: Member) => ({
          ...m,
          progress: m.trophies - m.start_trophies
        }));
        setMembers(processed);
      }
      if (data.lastSync) setLastSync(data.lastSync);
      setApiConfigured(data.apiConfigured || false);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_members' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'l' || e.key === 'L') && !showAdmin) {
        const entered = prompt('Podaj haslo Lidera Vanta Core:');
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
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-club?history=true`);
      const data = await response.json();
      if (data.history) {
        setHistoryData(data.history);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const parseBrawlifyData = (rawText: string) => {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const trustedSet = new Set(
    TRUSTED_TAGS.map(tag => tag.replace("#", "").toUpperCase())
  );

  const parsedMembers: Array<{ tag: string; name: string; trophies: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const rawTag = lines[i];
    const cleanTag = rawTag
      .replace("#", "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();

    if (!trustedSet.has(cleanTag)) continue;

    const normalizedTag = `#${cleanTag}`;

    const blockStart = Math.max(0, i - 5);
    const blockBefore = lines.slice(blockStart, i);

    if (blockBefore.some(line => line.toUpperCase() === "LEFT")) {
      continue;
    }

    let name = "";

    for (let j = blockBefore.length - 1; j >= 0; j--) {
      const candidate = blockBefore[j];
      const upper = candidate.toUpperCase();

      if (!candidate) continue;
      if (candidate.startsWith("#")) continue;
      if (/^#?\d+$/.test(candidate)) continue;
      if (upper === "LEFT") continue;
      if (upper === "MEMBER") continue;
      if (upper === "SENIOR") continue;
      if (upper === "PRESIDENT") continue;
      if (upper === "VICE PRESIDENT") continue;

      name = candidate;
      break;
    }

    if (!name && blockBefore.length >= 2) {
      name = blockBefore[blockBefore.length - 2];
    }

    let trophies = 0;

    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      const upper = lines[j].toUpperCase();

      if (upper === "TROPHIES") {
        for (let k = j + 1; k < Math.min(j + 4, lines.length); k++) {
          const num = parseInt(lines[k].replace(/[^0-9]/g, ""), 10);

          if (!isNaN(num) && num > 1000 && num < 200000) {
            trophies = num;
            break;
          }
        }
      }

      if (trophies > 0) break;
    }

    if (name && trophies > 0) {
      parsedMembers.push({
        tag: normalizedTag,
        name,
        trophies
      });
    }
  }

  return parsedMembers;
};

  const handleSync = async (forceAdd = false) => {
    if (!rawInput.trim()) return;
    setSyncing(true);

    const parsed = parseBrawlifyData(rawInput);

console.log("========== SYNC DEBUG ==========");
console.log("RAW INPUT:", rawInput);
console.log("TRUSTED TAGS:", TRUSTED_TAGS);
console.log("PARSED:", parsed);
console.log("PARSED COUNT:", parsed.length);

if (parsed.length === 0) {
  alert("Nie rozpoznano żadnych graczy.");
  setSyncing(false);
  return;
}

    // Debug: show what will be synced
    console.log(`${forceAdd ? 'Force adding' : 'Updating'} ${parsed.length} members:`, parsed.map(m => `${m.name ?? m.tag} (${m.tag}): ${m.trophies}`));

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-club`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forceAdd ? { forceAdd: true, members: parsed } : { members: parsed })
      });
      const result = await response.json();
      if (result.message) alert(result.message);
      setRawInput('');
      fetchData();
    } catch (err) {
      console.error('Sync error:', err);
      alert('Wystapil blad podczas synchronizacji.');
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoSync = async () => {
    setSyncing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-club`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSync: true, clubTag })
      });
      const result = await response.json();
      if (result.success) {
        alert(`Sukces: Zaktualizowano ${result.updated} graczy, dodano ${result.inserted} nowych z klubu ${result.clubName}`);
        fetchData();
      } else {
        alert(`Blad: ${result.error}\n\n${result.hint || ''}`);
      }
    } catch (err) {
      console.error('Auto-sync error:', err);
      alert('Wystapil blad podczas auto-sync.');
    } finally {
      setSyncing(false);
    }
  };

  const handleResetWeek = async () => {
    if (!confirm('Czy na pewno zresetowac tydzien? To zapisze wyniki w historii.')) return;
    setSyncing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-club`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetWeek: true })
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message);
        fetchData();
      } else {
        alert('Blad resetowania tygodnia.');
      }
    } catch (err) {
      console.error('Reset error:', err);
      alert('Blad resetowania tygodnia.');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.tag || !newMember.name || !newMember.trophies) return;
    setSyncing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sync-club`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceAdd: true,
          members: [{
            tag: newMember.tag.startsWith('#') ? newMember.tag : `#${newMember.tag}`,
            name: newMember.name,
            trophies: parseInt(newMember.trophies)
          }]
        })
      });
      const result = await response.json();
      if (result.success) {
        setNewMember({ tag: '', name: '', trophies: '' });
        setShowAddMember(false);
        fetchData();
      }
    } catch (err) {
      console.error('Add member error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleEditMember = async () => {
    if (!editingMember) return;
    setSyncing(true);
    try {
      const { error } = await supabase
        .from('club_members')
        .update({
          name: editingMember.name,
          trophies: editingMember.trophies
        })
        .eq('tag', editingMember.tag);
      if (!error) {
        setEditingMember(null);
        fetchData();
      }
    } catch (err) {
      console.error('Edit error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteMember = async (tag: string) => {
    if (!confirm('Na pewno usunac tego gracza?')) return;
    try {
      await supabase.from('club_members').delete().eq('tag', tag);
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400 inline" />;
    if (rank === 2) return <Crown className="w-6 h-6 text-gray-400 inline" />;
    if (rank === 3) return <Crown className="w-6 h-6 text-amber-600 inline" />;
    return <span className="text-purple-400 font-bold">{rank}</span>;
  };

  const mvp = members.length > 0
    ? members.reduce((best, m) => (m.progress || 0) > (best.progress || 0) ? m : best, members[0])
    : null;

  const weeksList = Object.keys(historyData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const openHistory = () => {
    setShowHistory(true);
    fetchHistory();
  };

  if (mode === 'home') {
    return (
      <div className="space-y-6">
        <div className="flex justify-center mb-6">
          <img
            src="https://i.postimg.cc/50ZYJHFT/bd1da3a6-7ce4-4e1f-8b94-cb9bb8712653.png"
            alt="Vanta Core Banner"
            className="max-w-full h-auto"
          />
        </div>

        {mvp && (mvp.progress || 0) > 0 && (
          <div className="bg-[rgba(255,0,127,0.05)] border-2 border-dashed border-pink-500 rounded-lg p-4 text-center animate-pulse shadow-[0_0_15px_rgba(255,0,127,0.3)]">
            <div className="text-sm tracking-widest text-pink-500 font-bold mb-1 drop-shadow-[0_0_5px_#ff007f]">
              NAJWIEKSZY PUSH TYGODNIA
            </div>
            <div className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_8px_#00ffcc]">
              {mvp.name} (+{mvp.progress})
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-purple-400">
            <RefreshCw className="w-6 h-6 animate-spin inline mr-2" />
            Ladowanie...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 text-sm text-purple-300">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{members.length} czlonkow</span>
              </div>
              {lastSync && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Ostatnia aktualizacja: {new Date(lastSync.sync_time).toLocaleString('pl-PL')}</span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-[#120b24] to-[#080410] border-2 border-purple-600 rounded-xl shadow-[0_0_25px_rgba(138,43,226,0.6)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-purple-600">
                    <th className="py-3 px-4 text-left text-pink-500 font-bold">TOP</th>
                    <th className="py-3 px-4 text-left text-pink-500 font-bold">Gracz</th>
                    <th className="py-3 px-4 text-left text-pink-500 font-bold">Pucharki</th>
                    <th className="py-3 px-4 text-left text-pink-500 font-bold">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, 5).map((member, idx) => (
                    <tr key={member.id} className="border-b border-purple-900/30 hover:bg-purple-900/10 transition-colors">
                      <td className="py-3 px-4">{getRankIcon(idx + 1)}</td>
                      <td className="py-3 px-4 font-bold">{member.name}</td>
                      <td className="py-3 px-4 text-cyan-400 font-bold">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          {member.trophies.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${member.progress! > 0 ? 'text-green-400' : member.progress! < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {member.progress! > 0 ? '+' : ''}{member.progress}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-center">
              <a href="/leaderboard" className="inline-flex items-center gap-2 text-purple-400 hover:text-pink-400 transition-colors text-sm">
                <TrendingUp className="w-4 h-4" />
                Zobacz pelny ranking
              </a>
            </div>
          </>
        )}

        <div className="text-center mt-4 text-xs text-purple-500/50">
          Wcisnij 'L' aby otworzyc panel lidera
        </div>
      </div>
    );
  }

  // Full leaderboard view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          Ranking Klubu
        </h1>
        <button
          onClick={openHistory}
          className="flex items-center gap-2 text-purple-400 hover:text-pink-400 transition-colors"
        >
          <History className="w-5 h-5" />
          <span className="text-sm font-medium">Historia tygodni</span>
        </button>
      </div>

      {/* History View */}
      {showHistory && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setShowHistory(false)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Wroc
            </button>
            <div className="flex items-center gap-2 text-purple-300">
              <History className="w-5 h-5" />
              <span className="font-bold text-lg">Historia tygodni</span>
            </div>
          </div>

          {historyLoading ? (
            <div className="text-center py-8 text-purple-400">
              <RefreshCw className="w-6 h-6 animate-spin inline mr-2" />
              Ladowanie historii...
            </div>
          ) : weeksList.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              Brak zapisanych tygodni. Kliknij "Nowy tydzien" w panelu lidera aby zapisac wyniki.
            </div>
          ) : (
            <div className="space-y-6">
              {weeksList.map(week => (
                <div key={week} className="bg-gradient-to-br from-[#120b24] to-[#080410] border border-purple-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 text-pink-400 font-bold">
                    <Calendar className="w-5 h-5" />
                    {new Date(week).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="grid gap-2">
                    {historyData[week]
                      .sort((a, b) => b.progress - a.progress)
                      .map((snap, idx) => (
                        <div key={snap.id} className="flex items-center justify-between bg-purple-900/20 rounded px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-purple-400 font-bold w-6">{idx + 1}.</span>
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
          {mvp && (mvp.progress || 0) > 0 && (
            <div className="bg-[rgba(255,0,127,0.05)] border-2 border-dashed border-pink-500 rounded-lg p-4 text-center animate-pulse shadow-[0_0_15px_rgba(255,0,127,0.3)]">
              <div className="text-sm tracking-widest text-pink-500 font-bold mb-1 drop-shadow-[0_0_5px_#ff007f]">
                NAJWIEKSZY PUSH TYGODNIA
              </div>
              <div className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_8px_#00ffcc]">
                {mvp.name} (+{mvp.progress})
              </div>
            </div>
          )}

          {showAdmin && (
            <div className="bg-[rgba(20,12,38,0.85)] border border-dashed border-purple-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3 text-purple-300">
                <Lock className="w-4 h-4" />
                <span className="font-bold text-sm">Panel Lidera</span>
              </div>

              <div className="flex gap-2 mb-4">
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
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  Nowy tydzien
                </button>
                {apiConfigured && (
                  <button
                    onClick={handleAutoSync}
                    disabled={syncing}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    Auto
                  </button>
                )}
              </div>

              {showAddMember && (
                <div className="bg-purple-900/30 p-3 rounded mb-4">
                  <div className="text-sm font-bold mb-2 text-purple-300">Dodaj nowego gracza:</div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Tag (#ABC123)"
                      value={newMember.tag}
                      onChange={e => setNewMember({ ...newMember, tag: e.target.value })}
                      className="bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:border-pink-500"
                    />
                    <input
                      type="text"
                      placeholder="Nazwa"
                      value={newMember.name}
                      onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                      className="bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:border-pink-500"
                    />
                    <input
                      type="number"
                      placeholder="Pucharki"
                      value={newMember.trophies}
                      onChange={e => setNewMember({ ...newMember, trophies: e.target.value })}
                      className="bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={syncing || !newMember.tag || !newMember.name || !newMember.trophies}
                    className="mt-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  >
                    Dodaj
                  </button>
                </div>
              )}

              <div className="bg-purple-900/30 p-3 rounded">
                <div className="text-sm font-bold mb-2 text-purple-300">Wklej dane z Brawlify:</div>
                <textarea
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  placeholder="Wklej dane tutaj..."
                  rows={4}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded p-2 text-white placeholder-purple-400 focus:outline-none focus:border-pink-500"
                />
                <div className="flex gap-2 mt-2">
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

              {apiConfigured && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={clubTag}
                    onChange={e => {
                      setClubTag(e.target.value);
                      localStorage.setItem(CLUB_TAG_KEY, e.target.value);
                    }}
                    placeholder="Club Tag (#XXXXXX)"
                    className="flex-1 bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white placeholder-purple-400"
                  />
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-purple-400">
              <RefreshCw className="w-6 h-6 animate-spin inline mr-2" />
              Ladowanie...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 text-sm text-purple-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{members.length} czlonkow</span>
                </div>
                {lastSync && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Ostatnia aktualizacja: {new Date(lastSync.sync_time).toLocaleString('pl-PL')}</span>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-[#120b24] to-[#080410] border-2 border-purple-600 rounded-xl shadow-[0_0_25px_rgba(138,43,226,0.6)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b-2 border-purple-600">
                        <th className="py-3 px-4 text-left text-pink-500 font-bold">TOP</th>
                        <th className="py-3 px-4 text-left text-pink-500 font-bold">Gracz</th>
                        <th className="py-3 px-4 text-left text-pink-500 font-bold">Pucharki</th>
                        <th className="py-3 px-4 text-left text-pink-500 font-bold">Start</th>
                        <th className="py-3 px-4 text-left text-pink-500 font-bold">Progress</th>
                        {showAdmin && <th className="py-3 px-4 text-left text-pink-500 font-bold">Akcje</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member, idx) => (
                        <tr key={member.id} className="border-b border-purple-900/30 hover:bg-purple-900/10 transition-colors">
                          <td className="py-3 px-4">{getRankIcon(idx + 1)}</td>
                          <td className="py-3 px-4 font-bold">{member.name}</td>
                          <td className="py-3 px-4 text-cyan-400 font-bold">
                            <div className="flex items-center gap-1">
                              <Trophy className="w-4 h-4 text-yellow-400" />
                              {member.trophies.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-purple-400">{member.start_trophies.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className={`font-bold ${member.progress! > 0 ? 'text-green-400' : member.progress! < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              {member.progress! > 0 ? '+' : ''}{member.progress}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div className="text-center mt-4 text-xs text-purple-500/50">
            Wcisnij 'L' aby otworzyc panel lidera
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#120b24] border border-purple-600 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edytuj gracza</h3>
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
                <label className="text-sm text-purple-300 block mb-1">Pucharki</label>
                <input
                  type="number"
                  value={editingMember.trophies}
                  onChange={e => setEditingMember({ ...editingMember, trophies: parseInt(e.target.value) || 0 })}
                  className="w-full bg-purple-900/50 border border-purple-600 rounded px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleEditMember}
                disabled={syncing}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded disabled:opacity-50"
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
    </div>
  );
}
