import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Copy, Crown, Link2, LoaderCircle, Radio, RefreshCw, Signal, UsersRound } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { getGetRoomQueryKey, useGetRoom } from '@workspace/api-client-react';
import { SyncJamBrand } from '@/components/syncjam-brand';
import { type Participant, useRoomSocket } from '@/lib/use-room-socket';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('connect')) return 'Connected';
  if (normalized.includes('sync')) return 'Syncing';
  if (normalized.includes('wait')) return 'Waiting';
  return 'Ready';
}

function ParticipantRow({ participant, index }: { participant: Participant; index: number }) {
  const colors = ['bg-[#d9ff58] text-[#28203f]', 'bg-[#ff755e] text-[#28203f]', 'bg-[#9e8be5] text-[#28203f]', 'bg-[#f7c95d] text-[#28203f]'];
  const isOnline = !participant.status.toLowerCase().includes('offline');

  return (
    <div data-testid={`row-participant-${participant.id}`} className="group flex items-center gap-4 border-b border-[#3c3155] py-4 last:border-0">
      <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xs font-extrabold ${colors[index % colors.length]}`}>
        {initials(participant.name)}
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#28203f] ${isOnline ? 'bg-[#d9ff58]' : 'bg-[#746983]'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-[#f5f0ff]">{participant.isSelf ? 'You' : participant.name}</p>
          {participant.isHost && <Crown size={13} className="text-[#d9ff58]" aria-label="Host" />}
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9b91ac]">
          {participant.isSelf ? 'Your device' : participant.isHost ? 'Host device' : 'Guest device'}
        </p>
      </div>
      <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] sm:block ${isOnline ? 'bg-[#3b3151] text-[#d9ff58]' : 'bg-[#3b3151] text-[#9b91ac]'}`}>
        {statusLabel(participant.status)}
      </span>
    </div>
  );
}

export default function Room() {
  const params = useParams<{ code?: string }>();
  const [, setLocation] = useLocation();
  const code = (params.code ?? '').toUpperCase();
  const [copied, setCopied] = useState(false);
  const roomQuery = useGetRoom(code, { query: { enabled: code.length === 5, queryKey: getGetRoomQueryKey(code), retry: false, staleTime: 15_000 } });
  const socket = useRoomSocket(code);

  useEffect(() => {
    document.title = code ? `Room ${code} · SyncJam` : 'SyncJam room';
    return () => {
      document.title = 'SyncJam';
    };
  }, [code]);

  const sortedParticipants = useMemo(
    () => [...socket.participants].sort((a, b) => Number(b.isHost) - Number(a.isHost)),
    [socket.participants],
  );
  const roomError = roomQuery.error as { error?: string } | null;
  const roomMissing = roomQuery.isError;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (code.length !== 5 || roomMissing) {
    return (
      <main className="syncjam-page syncjam-noise flex min-h-[100dvh] items-center justify-center px-5">
        <div className="w-full max-w-[460px] rounded-[28px] border border-[#d8d0e3] bg-[#fffdfd] p-7 text-center shadow-[0_24px_60px_rgba(40,32,63,0.1)] sm:p-10">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#ff755e] text-[#28203f]"><AlertTriangle size={24} /></div>
          <SyncJamBrand />
          <h1 className="syncjam-display mt-8 text-5xl text-[#28203f]">{roomMissing || code.length === 5 ? 'Room not found.' : 'No room code.'}</h1>
          <p className="mt-4 text-sm leading-6 text-[#756b89]">{roomError?.error ?? 'That room may have closed, or the code needs another look.'}</p>
          <button data-testid="button-back-home" type="button" onClick={() => setLocation('/')} className="syncjam-focus mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#28203f] text-sm font-bold text-[#d9ff58] transition hover:bg-[#3c305a]">
            <ArrowLeft size={17} /> Back to SyncJam
          </button>
        </div>
      </main>
    );
  }

  if (roomQuery.isLoading) {
    return (
      <main className="syncjam-page min-h-[100dvh] px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1120px] animate-pulse">
          <div className="h-9 w-28 rounded-xl bg-[#e2dced]" />
          <div className="mt-20 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="h-64 rounded-[28px] bg-[#e2dced]" />
            <div className="h-[480px] rounded-[28px] bg-[#e2dced]" />
          </div>
        </div>
      </main>
    );
  }

  const participantCount = Math.max(roomQuery.data?.participantCount ?? 0, sortedParticipants.length);
  const connectionCopy = socket.status === 'connected' ? 'Live presence' : socket.status === 'reconnecting' ? 'Reconnecting' : 'Connecting';
  const hasPresence = sortedParticipants.length > 0;

  return (
    <main className="min-h-[100dvh] bg-[#28203f] text-[#f5f0ff]">
      <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <SyncJamBrand tone="dark" />
        <button data-testid="button-leave-room" type="button" onClick={() => setLocation('/')} className="syncjam-focus flex items-center gap-2 rounded-full border border-[#4b3e65] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#aaa0bb] transition hover:border-[#d9ff58] hover:text-[#d9ff58]">
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Leave room</span>
        </button>
      </header>

      <div className="mx-auto max-w-[1240px] px-5 pb-12 pt-8 sm:px-8 sm:pt-12 lg:px-12 lg:pb-20">
        <div className="mb-8 flex flex-col gap-5 border-b border-[#403557] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#a9a0b9]">
              <span className={`h-2 w-2 rounded-full ${socket.status === 'connected' ? 'bg-[#d9ff58]' : 'bg-[#ff755e]'}`} />
              {connectionCopy}
            </div>
            <h1 className="syncjam-display text-[clamp(3.8rem,9vw,7.4rem)] leading-[0.82]">Your room.</h1>
          </div>
          <div className="flex items-center gap-3 sm:pb-1">
            <button data-testid="button-copy-room-code" type="button" onClick={copyCode} className="syncjam-focus flex items-center gap-3 rounded-2xl border border-[#4b3e65] bg-[#312747] px-4 py-3 text-left transition hover:border-[#d9ff58]">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9b91ac]">Room code</span>
              <span className="font-mono text-lg font-medium tracking-[0.16em] text-[#d9ff58]">{code}</span>
              {copied ? <Check size={16} className="text-[#d9ff58]" /> : <Copy size={16} className="text-[#9b91ac]" />}
            </button>
          </div>
        </div>

        {socket.status === 'reconnecting' && (
          <div data-testid="status-reconnecting" className="syncjam-scanline mb-6 flex items-center gap-3 rounded-2xl border border-[#8c594f] bg-[#4a3040] px-4 py-3 text-sm text-[#ffd1c7]">
            <RefreshCw size={16} className="animate-spin" />
            <span>Presence signal dropped. Looking for the room again.</span>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <section className="rounded-[28px] bg-[#d9ff58] p-6 text-[#28203f] sm:p-8">
            <div className="flex items-start justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#28203f] text-[#d9ff58]"><Signal size={22} /></div>
              <span className="rounded-full bg-[#c2e844] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em]">Room open</span>
            </div>
            <h2 className="syncjam-display mt-20 text-5xl leading-[0.88] sm:text-6xl">Pass the code.<br />Find the beat.</h2>
            <p className="mt-5 max-w-[310px] text-sm leading-6 text-[#4e5628]">Keep this screen open while friends join. Presence updates appear as devices connect.</p>
            <div className="mt-9 flex items-end justify-between border-t border-[#b6d53d] pt-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#687532]">Connected devices</p>
                <p data-testid="text-participant-count" className="mt-1 text-4xl font-extrabold tracking-[-0.06em]">{participantCount.toString().padStart(2, '0')}</p>
              </div>
              <UsersRound size={24} className="mb-1 text-[#687532]" />
            </div>
          </section>

          <section className="rounded-[28px] border border-[#403557] bg-[#312747] p-6 sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9b91ac]">Live presence</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">Who is in the room</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-[#3d3354] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d9ff58]">
                <Radio size={13} /> {socket.status === 'connected' ? 'Synced' : 'Standby'}
              </div>
            </div>

            <div className="mt-7">
              {hasPresence ? (
                sortedParticipants.map((participant, index) => <ParticipantRow key={participant.id} participant={participant} index={index} />)
              ) : (
                <div data-testid="empty-participants" className="syncjam-scanline flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#594c70] px-6 text-center">
                  {socket.status === 'connecting' || socket.status === 'reconnecting' ? (
                    <>
                      <LoaderCircle size={25} className="mb-4 animate-spin text-[#d9ff58]" />
                      <p className="text-sm font-bold text-[#f5f0ff]">Tuning into the room</p>
                      <p className="mt-2 max-w-[260px] text-xs leading-5 text-[#9b91ac]">Presence will appear as soon as the signal is established.</p>
                    </>
                  ) : (
                    <>
                      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#3d3354] text-[#9b91ac]"><Link2 size={20} /></div>
                      <p className="text-sm font-bold text-[#f5f0ff]">You are first in.</p>
                      <p className="mt-2 max-w-[260px] text-xs leading-5 text-[#9b91ac]">Share <span className="font-mono text-[#d9ff58]">{code}</span> with a friend to build the room.</p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center gap-2 text-[11px] text-[#9b91ac]">
              <Radio size={13} className="text-[#d9ff58]" />
              {socket.lastMessageAt ? 'Presence is updating live' : 'Waiting for the first presence snapshot'}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}