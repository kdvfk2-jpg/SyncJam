import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Copy, Crown, ExternalLink, Link2, LoaderCircle, Pause, Play, Radio, RefreshCw, Signal, UsersRound } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { getGetRoomQueryKey, useGetRoom } from '@workspace/api-client-react';
import { SyncJamBrand } from '@/components/syncjam-brand';
import { type Participant, type PlaybackState, useRoomSocket } from '@/lib/use-room-socket';
import { useYouTubePlayer } from '@/lib/use-youtube-player';

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

function extractYouTubeId(input: string) {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.endsWith('youtube.com')) {
      const queryId = url.searchParams.get('v');
      const pathId = url.pathname.split('/').filter(Boolean).at(-1);
      const id = queryId ?? (url.pathname.startsWith('/embed/') ? pathId : null);
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
  } catch {
    return null;
  }
  return null;
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

function VideoPanel({
  videoId,
  canLoad,
  onLoad,
  playback,
  onPlayback,
  clockOffsetMs,
}: {
  videoId: string | null;
  canLoad: boolean;
  onLoad: (videoId: string) => void;
  playback: PlaybackState | null;
  onPlayback: (playback: Pick<PlaybackState, 'action' | 'state' | 'positionSeconds'>) => void;
  clockOffsetMs: number | null;
}) {
  const [videoInput, setVideoInput] = useState(videoId ? `https://youtu.be/${videoId}` : '');
  const [videoError, setVideoError] = useState<string | null>(null);
  const player = useYouTubePlayer(videoId);
  const playbackState = playback?.state ?? 'paused';
  const [seekValue, setSeekValue] = useState(0);

  useEffect(() => {
    if (videoId) setVideoInput(`https://youtu.be/${videoId}`);
  }, [videoId]);

  useEffect(() => {
    setSeekValue(player.currentTime);
  }, [player.currentTime]);

  const getTimelinePosition = (nextPlayback: PlaybackState) => {
    if (nextPlayback.state !== 'playing') return nextPlayback.positionSeconds;
    const estimatedServerNow = Date.now() + (clockOffsetMs ?? 0);
    const elapsedSeconds = Math.max(0, estimatedServerNow - nextPlayback.serverTime) / 1000;
    return nextPlayback.positionSeconds + elapsedSeconds;
  };

  useEffect(() => {
    if (!videoId || !playback || player.status !== 'ready') return;
    player.seekTo(getTimelinePosition(playback));
    if (playback.state === 'playing') player.play();
    else player.pause();
  }, [videoId, playback, player.status]);

  useEffect(() => {
    if (!videoId || !playback || playback.state !== 'playing' || player.status !== 'ready') {
      return;
    }

    const correctDrift = () => {
      const expectedPosition = getTimelinePosition(playback);
        const driftSeconds = expectedPosition - (player.getCurrentTime() ?? 0);
      if (Math.abs(driftSeconds) > 0.35) {
        player.seekTo(expectedPosition);
      }
    };

    const correctionInterval = window.setInterval(correctDrift, 2000);
    return () => window.clearInterval(correctionInterval);
  }, [videoId, playback, player.status, clockOffsetMs]);

  const submitVideo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const extractedId = extractYouTubeId(videoInput);
    if (!extractedId) {
      setVideoError('Paste a YouTube URL or an 11-character video ID.');
      return;
    }
    setVideoError(null);
    onLoad(extractedId);
  };

  const publishPlayback = (action: PlaybackState['action'], state: PlaybackState['state'], positionSeconds: number) => {
    const safePosition = Math.max(0, positionSeconds);
    if (action === 'play') player.play();
    if (action === 'pause') player.pause();
    if (action === 'seek') player.seekTo(safePosition);
    onPlayback({ action, state, positionSeconds: safePosition });
  };

  const changePosition = (value: number) => {
    setSeekValue(value);
    publishPlayback('seek', playbackState, value);
  };

  return (
    <section className="mt-5 rounded-[28px] border border-[#403557] bg-[#312747] p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9b91ac]">Shared source</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">
            {videoId ? 'Video is loaded' : 'Load a video for the room'}
          </h2>
          <p className="mt-2 max-w-[560px] text-sm leading-6 text-[#9b91ac]">
            {canLoad
              ? 'Choose one YouTube video. Every connected phone will load its own official embedded player.'
              : 'The host chooses the shared YouTube video. You will see it here when it is ready.'}
          </p>
        </div>
        {videoId && (
          <a
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#d9ff58] transition hover:text-[#f0ffb0]"
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noreferrer"
          >
            Open on YouTube <ExternalLink size={13} />
          </a>
        )}
      </div>

      {canLoad && (
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={submitVideo}>
          <input
            data-testid="input-youtube-url"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#594c70] bg-[#28203f] px-4 text-sm text-[#f5f0ff] outline-none transition placeholder:text-[#7c718e] focus:border-[#d9ff58]"
            value={videoInput}
            onChange={(event) => setVideoInput(event.target.value)}
            placeholder="YouTube URL or video ID"
            aria-label="YouTube URL or video ID"
          />
          <button
            data-testid="button-load-video"
            type="submit"
            className="syncjam-focus min-h-12 rounded-xl bg-[#d9ff58] px-5 text-sm font-extrabold text-[#28203f] transition hover:bg-[#e3ff83]"
          >
            {videoId ? 'Change video' : 'Load video'}
          </button>
        </form>
      )}
      {videoError && <p className="mt-3 text-xs text-[#ff9c8c]">{videoError}</p>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#594c70] bg-[#28203f]">
        {videoId ? (
          <div className="aspect-video w-full" ref={player.containerRef} data-testid="youtube-player" />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#3d3354] text-[#d9ff58]">
              <Radio size={20} />
            </div>
            <p className="text-sm font-bold text-[#f5f0ff]">No video loaded yet</p>
            <p className="mt-2 max-w-[300px] text-xs leading-5 text-[#9b91ac]">
              {canLoad ? 'The embedded player will appear here after the host loads a video.' : 'Stay in the room while the host sets the source.'}
            </p>
          </div>
        )}
      </div>
      {videoId && canLoad && (
        <div className="mt-4 rounded-2xl border border-[#594c70] bg-[#28203f] p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#d9ff58]">
              {playbackState === 'playing' ? 'Playing for the room' : 'Paused for the room'}
            </p>
            <p className="font-mono text-[10px] text-[#9b91ac]">
              {formatTime(seekValue)} / {formatTime(player.duration)}
            </p>
          </div>
          <input
            data-testid="input-playback-position"
            className="mt-4 h-1.5 w-full cursor-pointer accent-[#d9ff58]"
            type="range"
            min="0"
            max={Math.max(player.duration, 1)}
            step="0.1"
            value={Math.min(seekValue, Math.max(player.duration, 1))}
            onChange={(event) => changePosition(Number(event.target.value))}
            disabled={player.status !== 'ready'}
            aria-label="Playback position"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              data-testid="button-play-video"
              type="button"
              onClick={() => publishPlayback('play', 'playing', player.currentTime)}
              disabled={player.status !== 'ready' || playbackState === 'playing'}
              className="syncjam-focus flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#d9ff58] px-4 text-xs font-extrabold text-[#28203f] transition hover:bg-[#e3ff83] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={15} fill="currentColor" /> Play
            </button>
            <button
              data-testid="button-pause-video"
              type="button"
              onClick={() => publishPlayback('pause', 'paused', player.currentTime)}
              disabled={player.status !== 'ready' || playbackState !== 'playing'}
              className="syncjam-focus flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#594c70] px-4 text-xs font-extrabold text-[#f5f0ff] transition hover:border-[#d9ff58] hover:text-[#d9ff58] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pause size={15} fill="currentColor" /> Pause
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#9b91ac]">
            {clockOffsetMs === null
              ? 'Measuring the room clock before the next correction.'
              : `Room clock aligned · ${clockOffsetMs >= 0 ? '+' : ''}${clockOffsetMs} ms`}
          </p>
        </div>
      )}
      {videoId && !canLoad && (
        <p className="mt-4 text-[11px] leading-5 text-[#9b91ac]">
          {clockOffsetMs === null
            ? 'Joining the room timeline…'
            : 'Following the host timeline with automatic drift correction.'}
        </p>
      )}
      {videoId && player.status === 'error' && (
        <p className="mt-3 text-xs text-[#ff9c8c]">The YouTube player could not load in this browser.</p>
      )}
    </section>
  );
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
  const isHost = sortedParticipants.some((participant) => participant.isSelf && participant.isHost);

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
        <VideoPanel
          videoId={socket.currentVideoId}
          canLoad={isHost}
          onLoad={socket.setCurrentVideo}
          playback={socket.currentPlayback}
          onPlayback={socket.setCurrentPlayback}
          clockOffsetMs={socket.clockOffsetMs}
        />
      </div>
    </main>
  );
}