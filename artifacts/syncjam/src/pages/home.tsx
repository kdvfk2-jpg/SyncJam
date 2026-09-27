import { useState } from 'react';
import { ArrowRight, Check, ChevronRight, LoaderCircle, LockKeyhole, Radio, Sparkles, UsersRound } from 'lucide-react';
import { useLocation } from 'wouter';
import { getHealthCheckQueryKey, useCreateRoom, useHealthCheck } from '@workspace/api-client-react';
import { SyncJamBrand } from '@/components/syncjam-brand';

function RoomCodeInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="group flex min-h-[60px] items-center gap-2 rounded-2xl border border-[#d4cde2] bg-[#fffdfd] p-2 pl-4 shadow-[0_10px_28px_rgba(40,32,63,0.06)] transition focus-within:border-[#28203f] focus-within:shadow-[0_10px_28px_rgba(40,32,63,0.12)]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#988fac]">Code</span>
      <input
        data-testid="input-room-code"
        className="min-w-0 flex-1 bg-transparent px-2 font-mono text-[17px] font-medium uppercase tracking-[0.18em] text-[#28203f] outline-none placeholder:text-[#c8c1d3]"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
        placeholder="A7K2Q"
        aria-label="Room code"
        inputMode="text"
        autoComplete="off"
      />
      <button
        data-testid="button-join-room"
        type="submit"
        className="syncjam-focus grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#28203f] text-[#d9ff58] transition duration-200 hover:-translate-y-0.5 hover:bg-[#3c305a] active:translate-y-0"
        aria-label="Join room"
      >
        <ArrowRight size={19} />
      </button>
    </form>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [roomCode, setRoomCode] = useState('');
  const createRoom = useCreateRoom();
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 30_000 } });

  const handleCreate = () => {
    createRoom.mutate(undefined, {
      onSuccess: (room) => setLocation(`/room/${room.code}`),
    });
  };

  const joinRoom = () => {
    if (roomCode.length === 5) setLocation(`/room/${roomCode}`);
  };

  const createError = createRoom.error as { error?: string } | null;
  const isHealthy = !health.isError && health.data?.status !== 'down';

  return (
    <main className="syncjam-page syncjam-noise min-h-[100dvh] overflow-hidden">
      <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <SyncJamBrand />
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#756b89]">
          <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-[#a8db2e]' : 'bg-[#ff755e]'}`} />
          <span className="hidden sm:inline">{isHealthy ? 'All systems live' : 'Checking signal'}</span>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1240px] gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.03fr_0.97fr] lg:gap-20 lg:px-12 lg:pb-28 lg:pt-24">
        <div className="flex flex-col justify-center">
          <div className="syncjam-rise mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#827792]">
            <Radio size={15} className="text-[#ff755e]" />
            <span>Nearby audio, one room</span>
          </div>
          <h1 className="syncjam-display syncjam-rise max-w-[690px] text-[clamp(3.8rem,10vw,7.8rem)] leading-[0.87] text-[#28203f]">
            The room
            <br />
            is the <em className="text-[#ff755e]">instrument.</em>
          </h1>
          <p className="syncjam-rise syncjam-rise-delay-1 mt-8 max-w-[490px] text-[16px] leading-7 text-[#675d78] sm:text-[18px]">
            Turn the phones already in the room into one shared sound system. Make a room, pass the code, and let the signal find everyone.
          </p>

          <div className="syncjam-rise syncjam-rise-delay-2 mt-9 flex flex-wrap gap-3 text-[12px] font-semibold text-[#514862]">
            <span className="flex items-center gap-2 rounded-full border border-[#d8d0e3] bg-[#fffdfd]/70 px-3 py-2">
              <UsersRound size={14} className="text-[#ff755e]" /> No accounts
            </span>
            <span className="flex items-center gap-2 rounded-full border border-[#d8d0e3] bg-[#fffdfd]/70 px-3 py-2">
              <LockKeyhole size={14} className="text-[#8170c8]" /> Private by code
            </span>
          </div>
        </div>

        <div className="relative flex min-h-[480px] items-center justify-center lg:min-h-[560px]">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[#d9ff58] blur-[1px] sm:h-52 sm:w-52" />
          <div className="absolute bottom-8 left-4 h-24 w-24 rounded-full bg-[#ff755e] sm:h-32 sm:w-32" />
          <div className="relative w-full max-w-[470px] rotate-[1.5deg] rounded-[28px] border border-[#43385f] bg-[#28203f] p-5 text-[#f5f0ff] shadow-[18px_22px_0_#b7abd0] transition-transform duration-500 hover:rotate-0 sm:p-7">
            <div className="mb-11 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#aaa0bb]">SyncJam / Room 01</span>
              <span className="flex items-center gap-2 rounded-full bg-[#3a3154] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d9ff58]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d9ff58]" /> Ready
              </span>
            </div>
            <div className="syncjam-scanline mb-10 flex h-32 items-center justify-center gap-1.5 rounded-2xl bg-[#312747] px-5">
              {[22, 48, 30, 67, 42, 84, 57, 92, 45, 71, 34, 62, 28, 53, 38, 76, 48, 31, 59, 24].map((height, index) => (
                <span key={index} className="w-full rounded-full bg-[#d9ff58]" style={{ height: `${height}%`, opacity: 0.35 + (index % 4) * 0.15 }} />
              ))}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-[#aaa0bb]">Room code</p>
                <p className="mt-1 font-mono text-3xl font-medium tracking-[0.18em] text-[#f5f0ff]">A7K2Q</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-[#aaa0bb]">In the room</p>
                <p className="mt-1 text-2xl font-bold text-[#ff755e]">04 <span className="text-sm font-medium text-[#aaa0bb]">phones</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1240px] gap-4 px-5 pb-20 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-12">
        <div className="syncjam-rise syncjam-rise-delay-2 rounded-[26px] border border-[#28203f] bg-[#28203f] p-6 text-[#f5f0ff] sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#aaa0bb]">Start a session</p>
              <h2 className="syncjam-display text-4xl leading-none sm:text-5xl">Make a room.</h2>
              <p className="mt-3 max-w-[390px] text-sm leading-6 text-[#bfb6ca]">One tap creates a five-character room code. Send it to the people next to you.</p>
            </div>
            <Sparkles size={22} className="shrink-0 text-[#d9ff58]" />
          </div>
          <button
            data-testid="button-create-room"
            type="button"
            disabled={createRoom.isPending}
            onClick={handleCreate}
            className="syncjam-focus mt-8 flex h-14 w-full items-center justify-between rounded-2xl bg-[#d9ff58] px-5 text-left text-[14px] font-extrabold text-[#28203f] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e3ff83] disabled:cursor-wait disabled:opacity-70"
          >
            <span>{createRoom.isPending ? 'Creating your room' : 'Create a new room'}</span>
            {createRoom.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <ChevronRight size={19} />}
          </button>
          {createError?.error && <p className="mt-3 text-xs text-[#ff9c8c]">{createError.error}</p>}
        </div>

        <div className="syncjam-rise syncjam-rise-delay-3 rounded-[26px] border border-[#d8d0e3] bg-[#fffdfd]/75 p-6 sm:p-8">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#827792]">Already have a code?</p>
          <h2 className="syncjam-display text-4xl leading-none text-[#28203f] sm:text-5xl">Join the room.</h2>
          <p className="mt-3 text-sm leading-6 text-[#756b89]">Ask the host for the five-character code, then step into the signal.</p>
          <div className="mt-7">
            <RoomCodeInput value={roomCode} onChange={setRoomCode} onSubmit={joinRoom} />
            {roomCode.length > 0 && roomCode.length < 5 && (
              <p className="mt-3 flex items-center gap-2 text-xs text-[#827792]"><Check size={13} /> Five characters gets you in.</p>
            )}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-[1240px] items-center justify-between border-t border-[#d8d0e3] px-5 py-6 text-[11px] font-semibold text-[#827792] sm:px-8 lg:px-12">
        <span className="font-mono uppercase tracking-[0.15em]">SyncJam / v0.1</span>
        <span>Just the room. Nothing else.</span>
      </footer>
    </main>
  );
}