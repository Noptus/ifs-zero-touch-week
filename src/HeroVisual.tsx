export default function HeroVisual() {
  const grid = Array.from({ length: 12 }, (_, i) => i - 1);
  return (
    <figure className="hero-visual" aria-label="Illustrative edge diagram. Operational events create the draft. A site camera contributes anonymous crossing evidence.">
      <div className="visual-header"><span><i /> SITE SIGNAL MODEL</span><span>GATE A / SYNTHETIC</span></div>
      <svg viewBox="0 0 520 357" role="img" aria-labelledby="hero-visual-title">
        <title id="hero-visual-title">Isometric site gate, crossing zone and evidence flow</title>
        <defs>
          <linearGradient id="plane" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#183545" /><stop offset="1" stopColor="#101d29" /></linearGradient>
          <linearGradient id="beam" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#6cebd0" stopOpacity=".4" /><stop offset="1" stopColor="#6cebd0" stopOpacity=".03" /></linearGradient>
          <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#234150" /></pattern>
          <clipPath id="diamond"><path d="M42 216L266 91 483 214 258 339Z" /></clipPath>
        </defs>
        <rect width="520" height="357" fill="url(#dots)" opacity=".7" />
        <path d="M42 216L266 91 483 214 258 339Z" fill="url(#plane)" stroke="#3f6573" />
        <g clipPath="url(#diamond)" stroke="#355364" opacity=".72">
          {grid.map(i => <path key={i} d={`M${-22 + i * 27} ${178 + i * 15} l250 -140 M${-2 + i * 28} ${247 - i * 16} l245 139`} />)}
        </g>
        <path d="M134 269l222-125 45 26-225 126Z" fill="#152a37" stroke="#457484" strokeDasharray="5 5" />
        <path d="M173 286l218-124" stroke="#6cebd0" opacity=".48" strokeDasharray="2 7" />
        <path d="M264 251l61-35-86-49-61 34Z" fill="#183e43" stroke="#6cebd0" strokeOpacity=".7" strokeDasharray="4 4" />
        <path d="M178 201l86 50" stroke="#6cebd0" strokeWidth="2" />
        <path d="M142 222V132l23-13v89m-23-76 23-13 88 49v12l-88-49m88 37v83" fill="none" stroke="#80a6bd" strokeWidth="2" strokeLinejoin="round" />
        <path d="M155 125l21-12 21 12-20 12Z" fill="#b3dce5" stroke="#76a6b7" />
        <path d="M177 137l20-12v12l-20 12-22-12v-12Z" fill="#305167" stroke="#76a6b7" />
        <circle cx="185" cy="138" r="2.5" fill="#6cebd0" />
        <path d="M185 138l79 113 61-35Z" fill="url(#beam)" stroke="#6cebd0" strokeOpacity=".25" />
        <ellipse cx="268" cy="213" rx="14" ry="7" fill="#6cebd0" opacity=".21" />
        <circle cx="268" cy="186" r="5" fill="#c9fff2" />
        <path d="M268 193v12m-6-7 6-5 6 4m-11 17 5-9 5 8" stroke="#c9fff2" strokeWidth="2" strokeLinecap="round" />
        <path d="M254 184v-6h7m14 0h7v6m-28 26v6h7m14 0h7v-6" fill="none" stroke="#6cebd0" strokeWidth="1.5" />
        <path d="M280 182h40l25-28h113M143 117H68L48 96M288 257h69l27 32h67" fill="none" stroke="#6796a4" strokeDasharray="3 4" />
        <circle cx="345" cy="154" r="3" fill="#6cebd0" /><circle cx="384" cy="289" r="3" fill="#f6aa69" />
        <g className="svg-label">
          <text x="45" y="85">EDGE CAMERA</text>
          <text x="347" y="143">ANONYMOUS TRACK</text>
          <text x="384" y="307" fill="#f6aa69">CROSSING ZONE</text>
        </g>
      </svg>
      <figcaption className="visual-footer"><span><i /> Edge observation</span><span><i /> Optional evidence</span></figcaption>
    </figure>
  );
}
