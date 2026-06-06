export default function Flag({ team, size = 20, className = "" }) {
  if (!team) return <span className="text-slate-500">🏳️</span>;
  return (
    <img
      src={team.flag_url}
      alt={team.name}
      width={size}
      height={Math.round(size * 0.67)}
      loading="lazy"
      className={`inline-block rounded-[3px] ring-1 ring-black/30 object-cover ${className}`}
      style={{ width: size, height: Math.round(size * 0.67) }}
      onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
    />
  );
}
