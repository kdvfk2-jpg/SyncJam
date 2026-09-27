import { Radio } from 'lucide-react';

type SyncJamBrandProps = {
  compact?: boolean;
  tone?: 'light' | 'dark';
};

export function SyncJamBrand({ compact = false, tone = 'light' }: SyncJamBrandProps) {
  const isDark = tone === 'dark';

  return (
    <div className={`flex items-center gap-3 ${isDark ? 'text-[#f5f0ff]' : 'text-[#28203f]'}`}>
      <span
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#d9ff58] text-[#28203f] shadow-[3px_3px_0_#28203f]"
        aria-hidden="true"
      >
        <Radio size={18} strokeWidth={2.5} />
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#ff755e]" />
      </span>
      {!compact && (
        <span className="text-[15px] font-extrabold tracking-[-0.045em]">
          sync<span className="text-[#ff755e]">jam</span>
        </span>
      )}
    </div>
  );
}