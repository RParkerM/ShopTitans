export function TierBadge({ tier }: { tier: number }) {
  const colors =
    tier >= 13 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
    tier >= 10 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
    tier >= 7  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
    tier >= 4  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors}`}>
      T{tier}
    </span>
  );
}
