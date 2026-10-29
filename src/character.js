/* Original vector companion: spiky dark hair, beige open hoodie, white tee, backpack straps,
   beige trousers and cream sneakers. Body parts are separate groups so CSS can animate them. */
(function () {
  const SVG = `
<svg class="hydra-guy" viewBox="0 0 200 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="hgSkin" cx="45%" cy="40%" r="65%">
      <stop offset="0" stop-color="#f8d4b2"/><stop offset="1" stop-color="#e7b48c"/>
    </radialGradient>
    <linearGradient id="hgJacket" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#efe2cc"/><stop offset="1" stop-color="#d6c2a2"/>
    </linearGradient>
    <linearGradient id="hgPants" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e6d9c1"/><stop offset="1" stop-color="#cdbd9f"/>
    </linearGradient>
    <linearGradient id="hgTee" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9e6df"/>
    </linearGradient>
  </defs>

  <ellipse class="hg-shadow" cx="100" cy="345" rx="54" ry="8" fill="#1d2b26" opacity=".16"/>

  <g class="hg-body">
    <g class="hg-leg hg-leg-l">
      <g>
        <path d="M76 204 H101 L100 300 H78 Z" fill="url(#hgPants)"/>
        <path d="M89 214 V292" stroke="#c4b393" stroke-width="1.4" fill="none"/>
        <path d="M75 292 Q88 299 102 292 L102 312 Q88 318 75 312 Z" fill="#d4c5a8"/>
        <path d="M71 320 Q71 307 84 306 H96 Q105 306 105 318 Q105 330 97 332 H76 Q70 332 71 324 Z" fill="#f5f0e7"/>
        <path d="M69 327 H106 V332 Q106 337 100 337 H74 Q69 337 69 332 Z" fill="#d9d0bf"/>
        <path d="M80 312 L95 312" stroke="#cfc6b4" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>
    <g class="hg-leg hg-leg-r">
      <g transform="matrix(-1 0 0 1 200 0)">
        <path d="M76 204 H101 L100 300 H78 Z" fill="url(#hgPants)"/>
        <path d="M89 214 V292" stroke="#c4b393" stroke-width="1.4" fill="none"/>
        <path d="M75 292 Q88 299 102 292 L102 312 Q88 318 75 312 Z" fill="#d4c5a8"/>
        <path d="M71 320 Q71 307 84 306 H96 Q105 306 105 318 Q105 330 97 332 H76 Q70 332 71 324 Z" fill="#f5f0e7"/>
        <path d="M69 327 H106 V332 Q106 337 100 337 H74 Q69 337 69 332 Z" fill="#d9d0bf"/>
        <path d="M80 312 L95 312" stroke="#cfc6b4" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>

    <g class="hg-arm hg-arm-r">
      <g transform="matrix(-1 0 0 1 200 0)">
        <path d="M60 118 Q74 114 78 128 L74 192 Q64 198 53 193 L46 142 Q48 122 60 118 Z" fill="url(#hgJacket)"/>
        <path d="M58 150 Q62 170 60 186" stroke="#cdb898" stroke-width="2" fill="none" stroke-linecap="round"/>
        <rect x="51" y="186" width="24" height="13" rx="5" fill="#d4c0a0"/>
        <path d="M56 188 V197 M61 188 V197 M66 188 V197 M71 188 V197" stroke="#c4ae8c" stroke-width="1.2"/>
        <ellipse cx="63" cy="208" rx="8.5" ry="10.5" fill="url(#hgSkin)"/>
      </g>
    </g>

    <path d="M60 124 Q64 112 82 108 H118 Q136 112 140 124 L146 204 Q146 214 138 215 H62 Q54 214 54 204 Z" fill="url(#hgJacket)"/>
    <path d="M84 110 H116 L118 212 H82 Z" fill="url(#hgTee)"/>
    <path d="M88 111 Q100 121 112 111" fill="none" stroke="#dedad1" stroke-width="2"/>
    <path d="M80 112 Q88 150 84 214 H76 Q80 160 72 116 Z" fill="#dccab0"/>
    <path d="M120 112 Q112 150 116 214 H124 Q120 160 128 116 Z" fill="#d2be9e"/>
    <path d="M94 150 Q100 152 106 150" stroke="#e4e0d8" stroke-width="1.5" fill="none"/>
    <rect x="55" y="202" width="30" height="13" rx="4" fill="#d6c3a5"/>
    <rect x="115" y="202" width="31" height="13" rx="4" fill="#ccb796"/>
    <circle cx="70" cy="208.5" r="1.8" fill="#4b4740"/><circle cx="77" cy="208.5" r="1.8" fill="#4b4740"/>
    <circle cx="123" cy="208.5" r="1.8" fill="#4b4740"/><circle cx="130" cy="208.5" r="1.8" fill="#4b4740"/>
    <path d="M66 166 L76 176 M134 166 L124 176" stroke="#c5b090" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M75 116 Q79 140 77 170" stroke="#2f2f33" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <path d="M125 116 Q121 140 123 170" stroke="#2f2f33" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <rect x="73" y="150" width="8" height="5" rx="1.5" fill="#9a9aa0"/>
    <rect x="119" y="150" width="8" height="5" rx="1.5" fill="#9a9aa0"/>

    <path d="M68 122 Q62 96 84 87 Q100 82 116 87 Q138 96 132 122 Q120 106 100 106 Q80 106 68 122 Z" fill="#e8dac3"/>
    <path d="M80 112 Q100 98 120 112 Q112 103 100 103 Q88 103 80 112 Z" fill="#c8b393"/>
    <rect x="91" y="92" width="18" height="18" rx="6" fill="#e2ad87"/>

    <g class="hg-head">
      <ellipse cx="70" cy="68" rx="6" ry="9" fill="#ecbb94"/>
      <ellipse cx="130" cy="68" rx="6" ry="9" fill="#ecbb94"/>
      <path d="M70 60 Q70 32 100 32 Q130 32 130 60 Q130 86 113 96 Q100 102 87 96 Q70 86 70 60 Z" fill="url(#hgSkin)"/>
      <path d="M67 62 Q63 36 81 27 Q100 17 120 25 Q137 33 133 62 Q129 46 119 41 Q100 46 83 41 Q73 47 67 62 Z" fill="#2b2a2e"/>
      <path d="M76 36 L70 14 L88 25 L89 5 L103 22 L112 3 L117 24 L134 12 L127 36 Q102 24 76 36 Z" fill="#2b2a2e"/>
      <path d="M90 12 L98 25 M111 9 L111 24 M128 17 L121 30" stroke="#4a4950" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M81 55 Q88 51 95 54" stroke="#2b2a2e" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M105 54 Q112 51 119 55" stroke="#2b2a2e" stroke-width="3" stroke-linecap="round" fill="none"/>
      <g class="hg-eyes">
        <ellipse cx="88.5" cy="66" rx="4.3" ry="5.2" fill="#2a2220"/>
        <ellipse cx="111.5" cy="66" rx="4.3" ry="5.2" fill="#2a2220"/>
        <circle cx="90" cy="64.2" r="1.5" fill="#fff"/>
        <circle cx="113" cy="64.2" r="1.5" fill="#fff"/>
      </g>
      <path d="M100 70 Q97.5 78 101 80" stroke="#d29a74" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="81" cy="78" rx="5" ry="3" fill="#f2967f" opacity=".35"/>
      <ellipse cx="119" cy="78" rx="5" ry="3" fill="#f2967f" opacity=".35"/>
      <path class="hg-mouth" d="M93 86 Q100 91 107 86" stroke="#a5604a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path class="hg-mouth-open" d="M92 85 Q100 96 108 85 Z" fill="#9c4f3d"/>
    </g>

    <g class="hg-arm hg-arm-l">
      <path d="M60 118 Q74 114 78 128 L74 192 Q64 198 53 193 L46 142 Q48 122 60 118 Z" fill="url(#hgJacket)"/>
      <path d="M58 150 Q62 170 60 186" stroke="#cdb898" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="51" y="186" width="24" height="13" rx="5" fill="#d4c0a0"/>
      <path d="M56 188 V197 M61 188 V197 M66 188 V197 M71 188 V197" stroke="#c4ae8c" stroke-width="1.2"/>
      <g class="hg-bottle">
        <rect x="55" y="186" width="16" height="10" rx="2.5" fill="#2f86c4"/>
        <rect x="52" y="194" width="22" height="46" rx="7" fill="#d4f0fb"/>
        <rect x="54.5" y="208" width="17" height="30" rx="5" fill="#59b6e8"/>
        <rect x="56" y="198" width="3.4" height="36" rx="1.7" fill="#fff" opacity=".75"/>
      </g>
      <ellipse cx="63" cy="210" rx="8.5" ry="10.5" fill="url(#hgSkin)"/>
    </g>
  </g>
</svg>`;

  window.HydraCharacter = {
    mount(el) {
      el.innerHTML = SVG;
      return el.querySelector('.hydra-guy');
    },
  };
})();
