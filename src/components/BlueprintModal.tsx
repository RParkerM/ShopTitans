import { useState, useRef, useEffect } from 'react';
import type { Blueprint, AscensionUpgrade, UserBlueprintData } from '../types';
import { getBlueprintImages } from '../utils/blueprintImages';
import { getMilestoneStatus } from '../utils/milestones';
import { TierBadge } from './TierBadge';

const SI      = '/fan-kit/Stat%20Indicators';
const HEROES  = `${SI}/Heroes`;
const MISC    = '/fan-kit/Misc%20Icons';
const CUR     = '/fan-kit/Currencies';

const ICONS = {
  value:       `${CUR}/icon_global_gold.png`,
  atk:         `${HEROES}/icon_global_attack.png`,
  def:         `${HEROES}/icon_global_defense.png`,
  hp:          `${HEROES}/icon_global_health.png`,
  eva:         `${HEROES}/icon_global_evasion.png`,
  crit:        `${HEROES}/icon_global_critchance.png`,
  airship:     `${SI}/icon_global_dragoninvasion_airshippower.png`,
  favor:       `${SI}/icon_global_kingscaprice_favor.png`,
  shard:       `${CUR}/bp_upgrade.png`,
  craft:       `${MISC}/icon_global_craft.png`,
};

// ── Shared sub-components ──────────────────────────────────────────────────

function HoldButton({ onClick, children, className }: { onClick: () => void; children: React.ReactNode; className: string }) {
  const cbRef = useRef(onClick);
  cbRef.current = onClick; // always current — no stale closure on rapid fire

  const timeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    cbRef.current();
    timeout.current = setTimeout(() => {
      interval.current = setInterval(() => cbRef.current(), 50);
    }, 400);
  };

  const stop = () => {
    if (timeout.current)  clearTimeout(timeout.current);
    if (interval.current) clearInterval(interval.current);
  };

  useEffect(() => stop, []); // clear on unmount

  return (
    <button
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={e => { e.preventDefault(); start(); }}
      onTouchEnd={stop}
      className={className}
    >
      {children}
    </button>
  );
}

function StatRow({ items }: { items: { icon: string; label: string; value: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {items.map(s => (
        <div key={s.label} className="flex items-center gap-1.5">
          <img src={s.icon} alt={s.label} className="h-5 w-5 object-contain" />
          <span className="text-sm font-semibold text-white">{s.value}</span>
          <span className="text-xs text-gray-400">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Info tab ──────────────────────────────────────────────────────────────

function InfoTab({ blueprint }: { blueprint: Blueprint }) {
  const { value, atk, def, hp, eva, crit, favor, airshipPower } = blueprint;

  const combatStats = [
    { icon: ICONS.atk,  label: 'ATK',  value: atk },
    { icon: ICONS.def,  label: 'DEF',  value: def },
    { icon: ICONS.hp,   label: 'HP',   value: hp },
    { icon: ICONS.eva,  label: 'EVA',  value: eva },
    { icon: ICONS.crit, label: 'CRIT', value: crit },
  ].filter(s => s.value > 0).map(s => ({ ...s, value: String(s.value) }));

  const row2 = [
    { icon: ICONS.airship, label: 'Airship', value: airshipPower },
    { icon: ICONS.favor,   label: 'Favor',   value: favor },
  ].filter(s => s.value > 0).map(s => ({ ...s, value: String(s.value) }));

  const row1 = [
    { icon: ICONS.value, label: 'Value', value: value.toLocaleString() },
    ...combatStats,
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatRow items={row1} />
      <StatRow items={row2} />
    </div>
  );
}

// ── Blueprint tab ─────────────────────────────────────────────────────────

const COMP = '/fan-kit/Components';

const STANDARD_COMPONENT_ICONS: Record<string, string> = {
  'Elven Wood':         `${COMP}/elvenwood.png`,
  'Iron Pine Cone':     `${COMP}/redpinecone.png`,
  'Glow Shroom':        `${COMP}/glowingmushrooms.png`,
  'Silver Dust':        `${COMP}/arcanedust.png`,
  'Webbed Wing':        `${COMP}/webbedwings.png`,
  'Precious Gem':       `${COMP}/preciousgem.png`,
  'Living Root':        `${COMP}/livingroots.png`,
  'Rustwyrm Scale':     `${COMP}/darkscale.png`,
  'Deep Pearl':         `${COMP}/icypearl.png`,
  'White Sand':         `${COMP}/whitesand.png`,
  'Bronze Fang':        `${COMP}/sharpfang.png`,
  'Moon Crystal':       `${COMP}/mooncrystal.png`,
  'Evil Eye':           `${COMP}/evileye.png`,
  'Silk Scarab':        `${COMP}/silkscarab.png`,
  'Star Metal':         `${COMP}/starmetal.png`,
  'Ancient Marble':     `${COMP}/ancientmarble.png`,
  'Overgrown Vine':     `${COMP}/overgrownvine.png`,
  'Chronos Crystal':    `${COMP}/timecrystal.png`,
  'Spooky Ectoplasm':   `${COMP}/ectoplasm.png`,
  'Thread of Fate':     `${COMP}/sewingthread.png`,
  'Ghastly Pennant':    `${COMP}/ghostflag.png`,
  'Deep Coral':         `${COMP}/deepcoral.png`,
  'Crystal Lullaby':    `${COMP}/sirenshard.png`,
  'Precious Shell':     `${COMP}/goldshell.png`,
  'Grim Talon':         `${COMP}/grimtalon.png`,
  'Zirconia Eggshell':  `${COMP}/crystalegg.png`,
  'Boreal Gale':        `${COMP}/icybreeze.png`,
  'Crush Claw':         `${COMP}/crabclaw.png`,
  'Raw Obsidian':       `${COMP}/obsidian.png`,
  'Magma Core':         `${COMP}/magmacore.png`,
  "Outsider's Claw":    `${COMP}/voidcrystal.png`,
  'All-Seeing Eye':     `${COMP}/voideye.png`,
  'Astral Fabric':      `${COMP}/voidcloth.png`,
  'Demigod Pinion':     `${COMP}/demigodpinion.png`,
  "Heaven's Crest":     `${COMP}/heavencrest.png`,
  'Divine Spark':       `${COMP}/divinespark.png`,
  'Mysterious Fossil':  `${COMP}/oldfossil.png`,
  'Dinosaur Leather':   `${COMP}/dinoleather.png`,
  'Ancient Amber':      `${COMP}/amber.png`,
  'Elder Wood':         `${COMP}/tw_elvenwood.png`,
  'Man-goroots':        `${COMP}/tw_livingroots.png`,
  'Full Moon Crystal':  `${COMP}/tw_mooncrystal.png`,
  'Star Metal Ingot':   `${COMP}/tw_starmetal.png`,
  'Kingtoplasm':        `${COMP}/tw_ectoplasm.png`,
  'Marble Pillar':      `${COMP}/tw_ancientmarble.png`,
  'Xzyur Claw':         `${COMP}/alienclaw.png`,
  'Xzyur Eye':          `${COMP}/alieneye.png`,
  'Alien Bulb':         `${COMP}/alienmushroom.png`,
  'Wing Nexus':         `${COMP}/tw_webbedwings.png`,
  'Paramount Gem':      `${COMP}/tw_preciousgem.png`,
  'Hybridized Vine':    `${COMP}/tw_overgrownvine.png`,
  'Rusted Pickaxe':     `${COMP}/rustyaxe.png`,
  'Deterioriated Book': `${COMP}/rustyscroll.png`,
  'Faded Cowl':         `${COMP}/rustyroguehat.png`,
  'Tattered Binder':    `${COMP}/rustycardscroll.png`,
  'Broken Torc':        `${COMP}/rustyamulet.png`,
  'Rusted Katana':      `${COMP}/rustysword.png`,
  'Rusted Tassets':     `${COMP}/rustyheavyarmor.png`,
  'Chunk of Boots':     `${COMP}/rustyboots.png`,
  'Ruined Mace':        `${COMP}/rustymace.png`,
  'Rusted Cannon':      `${COMP}/rustygun.png`,
  'Spent Knowledge':    `${COMP}/rustycup.png`,
  'Golden Chunk':       `${COMP}/tabletfragment.png`,
  'Opulent Jewel':      `${COMP}/tabletjewel.png`,
  'Platinum Bangles':   `${COMP}/platinumjewel.png`,
  'Precious Pearl':     `${COMP}/coraljewel.png`,
  'Sigil of Grace':     `${COMP}/gracesigil.png`,
  'Sigil of Spark':     `${COMP}/sparksigil.png`,
  'Sigil of Might':     `${COMP}/mightsigil.png`,
  'Sigil of True Grace': `${COMP}/gracesigil2.png`,
  'Sigil of True Spark': `${COMP}/sparksigil2.png`,
  'Sigil of True Might': `${COMP}/mightsigil2.png`,
};

const RES = '/fan-kit/Resources';

const RESOURCE_DEFS: { key: keyof Blueprint['resources']; icon: string | null; label: string }[] = [
  { key: 'iron',     icon: `${RES}/icon_global_resource_iron.png`,     label: 'Iron' },
  { key: 'wood',     icon: `${RES}/icon_global_resource_wood.png`,     label: 'Wood' },
  { key: 'leather',  icon: `${RES}/icon_global_resource_leather.png`,  label: 'Leather' },
  { key: 'herbs',    icon: `${RES}/icon_global_resource_herbs.png`,    label: 'Herbs' },
  { key: 'steel',    icon: `${RES}/icon_global_resource_steel.png`,    label: 'Steel' },
  { key: 'ironwood', icon: `${RES}/icon_global_resource_ironwood.png`, label: 'Ironwood' },
  { key: 'fabric',   icon: `${RES}/icon_global_resource_fabric.png`,   label: 'Fabric' },
  { key: 'oil',      icon: `${RES}/icon_global_resource_oils.png`,     label: 'Oil' },
  { key: 'ether',    icon: `${RES}/icon_global_resource_mana.png`,     label: 'Ether' },
  { key: 'jewels',   icon: `${RES}/icon_global_resource_gems.png`,     label: 'Jewels' },
  { key: 'essence',  icon: `${RES}/icon_global_resource_essence.png`,  label: 'Essence' },
  { key: 'stardust', icon: `${RES}/icon_global_resource_stardust.png`, label: 'Stardust' },
];

const QUALITY_SHADOW: Record<string, string> = {
  Superior:  'drop-shadow(-1px -1px 0 #2dcd00) drop-shadow(1px 1px 0 #2dcd00) drop-shadow(1px -1px 0 #2dcd00) drop-shadow(-1px 1px 0 #2dcd00) drop-shadow(0 0 5px rgba(45,205,0,.5)) drop-shadow(0 0 5px rgba(45,205,0,.5))',
  Flawless:  'drop-shadow(-1px -1px 0 #0ef) drop-shadow(1px 1px 0 #0ef) drop-shadow(1px -1px 0 #0ef) drop-shadow(-1px 1px 0 #0ef) drop-shadow(0 0 5px rgba(0,238,255,.5)) drop-shadow(0 0 5px rgba(0,238,255,.5))',
  Epic:      'drop-shadow(-1px -1px 0 #c300ff) drop-shadow(1px 1px 0 #c300ff) drop-shadow(1px -1px 0 #c300ff) drop-shadow(-1px 1px 0 #c300ff) drop-shadow(0 0 5px rgba(195,0,255,.5)) drop-shadow(0 0 5px rgba(195,0,255,.5))',
  Legendary: 'drop-shadow(-1px -1px 0 #ffe600) drop-shadow(1px 1px 0 #ffe600) drop-shadow(1px -1px 0 #ffe600) drop-shadow(-1px 1px 0 #ffe600) drop-shadow(0 0 5px rgba(255,230,0,.5)) drop-shadow(0 0 5px rgba(255,230,0,.5))',
};

function ComponentIcon({ component }: { component: Blueprint['components'][number] }) {
  const { name, amount, quality } = component;
  const isItem = quality !== '' && quality !== '---';
  const [imgSrc, setImgSrc] = useState<string | null>(() => {
    if (!isItem) return STANDARD_COMPONENT_ICONS[name] ?? null;
    return getBlueprintImages(name, '', '---').itemImage;
  });

  const shadow = QUALITY_SHADOW[quality];

  return (
    <div className="flex flex-col items-center gap-1">
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={name}
          title={name}
          className="h-8 w-8 object-contain"
          style={shadow ? { filter: shadow } : undefined}
          onError={() => setImgSrc(null)}
          draggable={false}
        />
      ) : (
        <div className="h-8 w-8 flex items-center justify-center text-[9px] text-gray-500 leading-tight text-center px-0.5">
          {name}
        </div>
      )}
      <span className="text-xs font-semibold text-white tabular-nums">{amount}</span>
    </div>
  );
}

function BlueprintTab({ blueprint }: { blueprint: Blueprint }) {
  const { resources, components } = blueprint;
  const presentResources = RESOURCE_DEFS.filter(r => resources[r.key] > 0);

  if (presentResources.length === 0 && components.length === 0) {
    return <div className="text-gray-600 text-sm text-center py-8">No resource data.</div>;
  }

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {presentResources.map(r => (
        <div key={r.key} className="flex flex-col items-center gap-1">
          {r.icon ? (
            <img src={r.icon} alt={r.label} title={r.label} className="h-8 w-8 object-contain" draggable={false} />
          ) : (
            <div className="h-8 w-8 flex items-center justify-center text-[9px] text-gray-500 leading-tight text-center">
              {r.label}
            </div>
          )}
          <span className="text-xs font-semibold text-white tabular-nums">{resources[r.key]}</span>
        </div>
      ))}
      {components.map(c => (
        <ComponentIcon key={c.name} component={c} />
      ))}
    </div>
  );
}

// ── Milestones tab ────────────────────────────────────────────────────────

interface MilestonesTabProps {
  blueprint: Blueprint;
  craftCount: number;
  starforged: boolean;
  onCraftCountChange: (v: number) => void;
}

function MilestoneList({
  milestones,
  craftCount,
  accent,
  onSetCount,
}: {
  milestones: Blueprint['craftingMilestones'];
  craftCount: number;
  accent: 'amber' | 'purple';
  onSetCount: (v: number) => void;
}) {
  const done   = accent === 'amber' ? 'bg-amber-500/10 border-amber-700/40' : 'bg-purple-500/10 border-purple-700/40';
  const check  = accent === 'amber' ? 'border-amber-500 bg-amber-500' : 'border-purple-500 bg-purple-500';
  const header = accent === 'amber' ? 'text-gray-500' : 'text-purple-400/70';
  const label  = accent === 'amber' ? 'Crafting' : 'Starforged';

  return (
    <div>
      <div className={`text-xs mb-2 font-medium uppercase tracking-wider ${header}`}>{label}</div>
      <div className="flex flex-col gap-1.5">
        {milestones.map((m, i) => {
          const complete = craftCount >= m.craftsNeeded;
          return (
            <button
              key={i}
              onClick={() => onSetCount(m.craftsNeeded)}
              className={`flex items-center gap-2.5 text-xs rounded-lg px-3 py-2 border w-full text-left transition-colors ${
                complete
                  ? `${done} hover:brightness-125`
                  : 'bg-gray-800/60 border-transparent hover:bg-gray-700/60'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                complete ? check : 'border-gray-600'
              }`}>
                {complete && <span className="text-gray-900 text-[9px] font-bold leading-none">✓</span>}
              </div>
              <span className={`flex-1 ${complete ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                {m.reward}
              </span>
              <span className={`shrink-0 tabular-nums ${complete ? 'text-gray-700' : 'text-gray-500'}`}>
                {m.craftsNeeded}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MilestonesTab({ blueprint, craftCount, starforged, onCraftCountChange }: MilestonesTabProps) {
  const { craftingMilestones, starforgedMilestones } = blueprint;

  const lastCraftThreshold = craftingMilestones.length > 0
    ? craftingMilestones[craftingMilestones.length - 1].craftsNeeded
    : 0;
  const offsetSfMilestones = starforgedMilestones.map(m => ({
    ...m,
    craftsNeeded: m.craftsNeeded + lastCraftThreshold,
  }));

  const craftStatus = getMilestoneStatus(craftCount, craftingMilestones);

  return (
    <div className="flex flex-col gap-5">
      {/* Craft count input */}
      <div className="flex items-center gap-2.5">
        <img src={ICONS.craft} alt="Crafts" className="h-5 w-5 object-contain" />
        <span className="text-sm text-gray-400">Crafts</span>
        {craftingMilestones.length > 0 && !craftStatus.allComplete && (
          <span className="text-xs text-gray-600 ml-1">
            {craftStatus.craftsToNext} to next
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <input
            type="number"
            min={0}
            value={craftCount === 0 ? '' : craftCount}
            placeholder="0"
            onChange={e => onCraftCountChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white text-right focus:outline-none focus:border-amber-500"
          />
          <HoldButton
            onClick={() => onCraftCountChange(Math.max(0, craftCount - 1))}
            className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-xs font-bold leading-none select-none"
          >−</HoldButton>
          <HoldButton
            onClick={() => onCraftCountChange(craftCount + 1)}
            className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-xs font-bold leading-none select-none"
          >+</HoldButton>
        </div>
      </div>

      {craftingMilestones.length > 0 && (
        <MilestoneList milestones={craftingMilestones} craftCount={craftCount} accent="amber" onSetCount={onCraftCountChange} />
      )}

      {starforged && offsetSfMilestones.length > 0 && (
        <MilestoneList milestones={offsetSfMilestones} craftCount={craftCount} accent="purple" onSetCount={onCraftCountChange} />
      )}

      {craftingMilestones.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-4">No milestones for this blueprint.</p>
      )}
    </div>
  );
}

// ── Ascension tab ─────────────────────────────────────────────────────────

interface AscensionTabProps {
  upgrades: AscensionUpgrade[];
  ascensionLevel: number;
  ascensionShards: number;
  onLevelChange: (v: number) => void;
  onShardsChange: (v: number) => void;
}

function AscensionTab({ upgrades, ascensionLevel, ascensionShards, onLevelChange, onShardsChange }: AscensionTabProps) {
  if (upgrades.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-4">No ascension data for this blueprint.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {upgrades.map((upgrade, i) => {
        const level   = i + 1;
        const unlocked = ascensionLevel >= level;
        return (
          <button
            key={i}
            onClick={() => onLevelChange(ascensionLevel >= level ? level - 1 : level)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left w-full transition-colors ${
              unlocked
                ? 'bg-amber-500/10 border border-amber-600/30 hover:bg-amber-500/15'
                : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
            }`}
          >
            {/* Level stars */}
            <div className="flex gap-0.5 shrink-0">
              {[1, 2, 3].map(s => (
                <span key={s} className={`text-sm leading-none ${
                  s <= level
                    ? (unlocked ? 'text-amber-400' : 'text-gray-600')
                    : 'text-transparent'
                }`}>★</span>
              ))}
            </div>

            {/* Description */}
            <span className={`flex-1 text-xs leading-snug ${unlocked ? 'text-gray-200' : 'text-gray-400'}`}>
              {upgrade.description}
            </span>

            {/* Shard cost */}
            <div className="flex items-center gap-1 shrink-0">
              <img src={ICONS.shard} alt="shards" className="h-4 w-4 object-contain" />
              <span className={`text-xs tabular-nums ${unlocked ? 'text-gray-500' : 'text-gray-400'}`}>
                {upgrade.shardCost}
              </span>
            </div>
          </button>
        );
      })}

      {/* Shard balance */}
      <div className="flex items-center gap-2.5 border-t border-gray-700 pt-4">
        <img src={ICONS.shard} alt="shards" className="h-5 w-5 object-contain" />
        <span className="text-sm text-gray-400">Shards</span>
        <input
          type="number"
          min={0}
          value={ascensionShards === 0 ? '' : ascensionShards}
          placeholder="0"
          onChange={e => onShardsChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="ml-auto w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white text-right focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────

type Tab = 'info' | 'blueprint' | 'milestones' | 'ascension';
const TABS: Tab[] = ['info', 'blueprint', 'milestones', 'ascension'];

interface BlueprintModalProps {
  blueprint: Blueprint;
  blueprints: Blueprint[];
  data: UserBlueprintData;
  onUpdate: (name: string, patch: Partial<UserBlueprintData>) => void;
  onNavigate: (bp: Blueprint) => void;
  onClose: () => void;
}

export function BlueprintModal({ blueprint, blueprints, data, onUpdate, onNavigate, onClose }: BlueprintModalProps) {
  const [tab, setTab] = useState<Tab>('info');
  const { name, type, tier, source, ascensionUpgrades } = blueprint;
  const { owned, starforged, ascensionLevel, craftCount, ascensionShards } = data;

  const [imgSrc, setImgSrc] = useState<string | null>(() => getBlueprintImages(name, type, source).itemImage);
  const { circleBackground, itemImageFallback } = getBlueprintImages(name, type, source);

  useEffect(() => { setImgSrc(getBlueprintImages(name, type, source).itemImage); }, [name, type, source]);

  const currentIndex = blueprints.findIndex(b => b.name === name);
  const canNav = blueprints.length > 1;
  const prev = canNav ? blueprints[(currentIndex - 1 + blueprints.length) % blueprints.length] : null;
  const next = canNav ? blueprints[(currentIndex + 1) % blueprints.length] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  && prev) onNavigate(prev);
      if (e.key === 'ArrowRight' && next) onNavigate(next);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, onNavigate, onClose]);

  const navBtn = 'relative z-20 shrink-0 w-11 h-11 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-default';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center gap-3 p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Left nav */}
      <button className={navBtn} disabled={!prev}  onClick={e => { e.stopPropagation(); prev && onNavigate(prev); }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="13 4 7 10 13 16" />
        </svg>
      </button>

      {/* Modal card */}
      <div
        className="relative z-10 w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-200 transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6 gap-2">
          {/* Image circle */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <img src={circleBackground} alt="" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={name}
                className="relative z-10 w-14 h-14 object-contain drop-shadow-lg"
                onError={() => {
                  if (itemImageFallback && imgSrc !== itemImageFallback) {
                    setImgSrc(itemImageFallback);
                  } else {
                    setImgSrc(null);
                  }
                }}
                draggable={false}
              />
            ) : (
              <span className="relative z-10 text-2xl text-gray-500 select-none">{type[0]}</span>
            )}
          </div>

          {/* Name + tier + type */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-white font-bold text-base leading-tight">{name}</h2>
            <div className="flex items-center gap-2">
              <TierBadge tier={tier} />
              <span className="text-gray-500 text-xs">{type}</span>
            </div>
          </div>

          {/* Own + SF toggles */}
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={owned}
                onChange={e => onUpdate(name, e.target.checked ? { owned: true } : { owned: false, starforged: false })}
                className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
              />
              Owned
            </label>
            {owned && (
              <label className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${starforged ? 'text-purple-400' : 'text-gray-400'}`}>
                <input
                  type="checkbox"
                  checked={starforged}
                  onChange={e => onUpdate(name, { starforged: e.target.checked })}
                  className="accent-purple-500 w-3.5 h-3.5 cursor-pointer"
                />
                Starforged
              </label>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-y border-gray-700 shrink-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-amber-400 border-b-2 border-amber-500 -mb-px'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div className="overflow-y-auto flex-1 p-4">
          {tab === 'info' && <InfoTab blueprint={blueprint} />}
          {tab === 'blueprint' && <BlueprintTab blueprint={blueprint} />}
          {tab === 'milestones' && (
            <MilestonesTab
              blueprint={blueprint}
              craftCount={craftCount}
              starforged={starforged}
              onCraftCountChange={v => onUpdate(name, { craftCount: v })}
            />
          )}
          {tab === 'ascension' && (
            <AscensionTab
              upgrades={ascensionUpgrades}
              ascensionLevel={ascensionLevel}
              ascensionShards={ascensionShards}
              onLevelChange={v => onUpdate(name, { ascensionLevel: v })}
              onShardsChange={v => onUpdate(name, { ascensionShards: v })}
            />
          )}
        </div>
      </div>

      {/* Right nav */}
      <button className={navBtn} disabled={!next} onClick={e => { e.stopPropagation(); next && onNavigate(next); }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7 4 13 10 7 16" />
        </svg>
      </button>
    </div>
  );
}
