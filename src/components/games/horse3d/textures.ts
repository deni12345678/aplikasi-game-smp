import * as THREE from 'three';

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createTurfTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 512);
  const stripeCount = 16;
  const stripeW = canvas.width / stripeCount;

  // Alternating mowed emerald grass bands running longitudinally along track (-Z)
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#4ca92f' : '#3b9223';
    ctx.fillRect(i * stripeW, 0, stripeW + 1, canvas.height);

    // Subtle sunlit highlight edge on each mowed band
    ctx.fillStyle = i % 2 === 0 ? 'rgba(170, 232, 95, 0.14)' : 'rgba(20, 68, 12, 0.12)';
    ctx.fillRect(i * stripeW, 0, 3, canvas.height);
  }

  // Fine organic turf blades & subtle soil grain so grass looks tactile up close
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < 18000; i++) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    const h = 3 + rand() * 7;
    const shade = rand();
    ctx.fillStyle =
      shade > 0.65
        ? 'rgba(148, 224, 88, 0.22)'
        : shade > 0.25
        ? 'rgba(34, 98, 20, 0.22)'
        : 'rgba(116, 102, 56, 0.12)';
    ctx.fillRect(x, y, 1.5, h);
  }

  // Subtle racing lane white turf tick lines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let lane = 1; lane < 5; lane++) {
    const lx = (canvas.width / 5) * lane;
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.fillRect(lx - 1, y, 2, 12);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 56);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createOutfieldGrassTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#479831';
  ctx.fillRect(0, 0, 512, 512);

  let seed = 9001;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 6500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(128, 206, 78, 0.18)' : 'rgba(28, 78, 18, 0.2)';
    ctx.fillRect(x, y, 2, 5 + rand() * 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 80);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createBoostStripTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 512);
  ctx.fillStyle = '#2d8a22';
  ctx.fillRect(0, 0, 256, 512);

  // Bright lime-gold turf speed chevrons pointing forward (-Z -> top of UV)
  ctx.fillStyle = '#a3e635';
  for (let y = 24; y < 512; y += 84) {
    ctx.beginPath();
    ctx.moveTo(28, y + 48);
    ctx.lineTo(128, y);
    ctx.lineTo(228, y + 48);
    ctx.lineTo(202, y + 66);
    ctx.lineTo(128, y + 28);
    ctx.lineTo(54, y + 66);
    ctx.closePath();
    ctx.fill();
  }

  // Side borders
  ctx.fillStyle = '#fde047';
  ctx.fillRect(4, 0, 8, 512);
  ctx.fillRect(244, 0, 8, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createMudPatchTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);

  const grad = ctx.createRadialGradient(128, 128, 28, 128, 128, 120);
  grad.addColorStop(0, 'rgba(92, 62, 34, 0.96)');
  grad.addColorStop(0.68, 'rgba(110, 78, 44, 0.88)');
  grad.addColorStop(1, 'rgba(84, 64, 38, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();

  let seed = 4242;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 420; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 98;
    const x = 128 + Math.cos(a) * r;
    const y = 128 + Math.sin(a) * r;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(58, 36, 18, 0.55)' : 'rgba(138, 102, 64, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y, 2 + rand() * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createCrowdTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 256);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 1024, 256);

  const shirtColors = [
    '#e11d48',
    '#2563eb',
    '#f59e0b',
    '#10b981',
    '#f8fafc',
    '#7c3aed',
    '#ec4899',
    '#0284c7',
    '#fb923c',
    '#cbd5e1',
  ];

  let seed = 777;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Stepped terrace rows
  for (let row = 0; row < 10; row++) {
    const y = 14 + row * 24;
    ctx.fillStyle = row % 2 === 0 ? '#475569' : '#3f4d63';
    ctx.fillRect(0, y, 1024, 24);

    for (let x = 6; x < 1018; x += 12) {
      // Concrete aisle gaps
      if (x % 256 < 16) continue;
      const color = shirtColors[Math.floor(rand() * shirtColors.length)];
      const jitterY = (rand() - 0.5) * 4;
      // Torso
      ctx.fillStyle = color;
      ctx.fillRect(x, y + 8 + jitterY, 9, 13);
      // Head / hat
      ctx.fillStyle = rand() > 0.72 ? '#fef3c7' : rand() > 0.4 ? '#eab38f' : '#a16207';
      ctx.beginPath();
      ctx.arc(x + 4.5, y + 5 + jitterY, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createGrandstandFacadeTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 512);
  // Warm cream concrete structure
  ctx.fillStyle = '#d6d3cb';
  ctx.fillRect(0, 0, 1024, 512);

  // 4 upper glass + steel balcony tiers
  for (let tier = 0; tier < 4; tier++) {
    const y = 32 + tier * 96;
    // Recessed glass skybox floor
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(16, y, 992, 62);

    // Reflective sky tint panes
    for (let x = 24; x < 996; x += 48) {
      ctx.fillStyle = x % 96 === 24 ? 'rgba(125, 211, 252, 0.35)' : 'rgba(56, 189, 248, 0.2)';
      ctx.fillRect(x, y + 6, 40, 46);
    }

    // Steel slab & balustrade rail
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, y + 62, 1024, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, y + 76, 1024, 6);
  }

  // Royal navy entrance awning on ground level (like "ASCOT" awning in reference)
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(60, 418, 300, 84);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.strokeRect(64, 422, 292, 76);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('AL MUMTAZ DERBY', 210, 470);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(2, 1);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createClockTowerTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 512);
  ctx.fillStyle = '#ded5bd';
  ctx.fillRect(0, 0, 256, 512);

  // Stone trim columns
  ctx.fillStyle = '#c4b898';
  ctx.fillRect(0, 0, 22, 512);
  ctx.fillRect(234, 0, 22, 512);
  ctx.fillRect(0, 250, 256, 18);

  // Arched scoreboard panel
  ctx.fillStyle = '#292524';
  ctx.fillRect(42, 286, 172, 188);
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TURF DERBY', 128, 326);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('1.200 METER', 128, 362);
  ctx.fillText('DESSA MENTARI', 128, 398);

  // Classic circular clock dial at top
  ctx.fillStyle = '#fefce8';
  ctx.beginPath();
  ctx.arc(128, 128, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#78350f';
  ctx.stroke();

  // Clock hands
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128, 80);
  ctx.moveTo(128, 128);
  ctx.lineTo(164, 146);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createFinishBannerTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 192);
  const sq = 32;
  for (let y = 0; y < 192; y += sq) {
    for (let x = 0; x < 1024; x += sq) {
      const dark = ((x / sq) + (y / sq)) % 2 === 0;
      ctx.fillStyle = dark ? '#dc2626' : '#ffffff';
      ctx.fillRect(x, y, sq, sq);
    }
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(190, 34, 644, 124);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(194, 38, 636, 116);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GARIS FINIS · DERBY 3D', 512, 98);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(8, 22, 10, 0.62)');
  grad.addColorStop(0.55, 'rgba(8, 22, 10, 0.32)');
  grad.addColorStop(1, 'rgba(8, 22, 10, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createNameplateTexture(
  label: string,
  accentHex: string,
  isPlayer: boolean
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(384, 84);
  ctx.clearRect(0, 0, 384, 84);

  ctx.fillStyle = isPlayer ? 'rgba(6, 78, 59, 0.92)' : 'rgba(15, 23, 42, 0.86)';
  ctx.fillRect(8, 8, 368, 68);

  ctx.fillStyle = accentHex;
  ctx.fillRect(8, 8, 14, 68);

  ctx.strokeStyle = isPlayer ? '#fbbf24' : 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 368, 68);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const trimmed = label.length > 18 ? `${label.slice(0, 17)}…` : label;
  ctx.fillText(trimmed, 36, 43);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export type JockeySilkPattern = 'stripes' | 'chevron' | 'diamonds' | 'stars' | 'flames';

export interface JockeySpriteSheetHandle {
  texture: THREE.CanvasTexture;
  redraw: (avatarIcon: string, avatarPhoto?: string) => void;
  dispose: () => void;
}

export function createJockeyAvatarSpriteSheet(options: {
  avatarIcon: string;
  avatarPhoto?: string;
  silkHex: string;
  accentHex: string;
  pattern: JockeySilkPattern;
  isPlayer: boolean;
}): JockeySpriteSheetHandle {
  const frameSize = 128;
  const frameCount = 4;
  const [canvas, ctx] = makeCanvas(frameSize * frameCount, frameSize);

  let disposed = false;
  let currentIcon = options.avatarIcon || '🏇';
  let currentPhotoUrl = options.avatarPhoto;
  let loadedPhotoImg: HTMLImageElement | null = null;
  let loadSeq = 0;

  const renderFrames = (icon: string, photoImg: HTMLImageElement | null) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const hasReadyPhoto =
      photoImg !== null && photoImg.complete && photoImg.naturalWidth > 0 && photoImg.naturalHeight > 0;

    for (let f = 0; f < frameCount; f++) {
      const ox = f * frameSize;
      const cx = ox + 64;
      const cy = 66;
      const bobY = [0, -4, -7, -2][f];
      const scarfLift = [6, -4, -12, -2][f];
      const tilt = [-0.04, 0.03, 0.07, -0.02][f];

      ctx.save();

      // 1. Speed wind streaks behind the jockey medallion (intensify across gallop frames)
      ctx.strokeStyle = options.isPlayer
        ? 'rgba(253, 224, 71, 0.85)'
        : 'rgba(226, 232, 240, 0.72)';
      ctx.lineCap = 'round';
      for (let s = 0; s < 3; s++) {
        const sy = 44 + s * 20 + bobY * 0.5;
        const len = 14 + ((f + s) % 3) * 8;
        ctx.lineWidth = s === 1 ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(ox + 12 + (f % 2) * 4, sy);
        ctx.lineTo(ox + 12 + len, sy);
        ctx.stroke();
      }

      // 2. Flowing jockey silk scarf/pennant flapping across frames 0..3
      ctx.fillStyle = options.accentHex;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 6 + bobY);
      ctx.quadraticCurveTo(cx - 38, cy - 12 + scarfLift, ox + 10, cy + 4 + scarfLift * 1.2);
      ctx.quadraticCurveTo(cx - 34, cy + 12 + scarfLift * 0.5, cx - 18, cy + 12 + bobY);
      ctx.closePath();
      ctx.fill();

      // 3. Jockey emblem medallion body with distinct silk pattern
      ctx.translate(cx + 4, cy + bobY);
      ctx.rotate(tilt);

      // Outer glow ring for player or crisp rim for rivals
      ctx.fillStyle = options.isPlayer ? '#fbbf24' : '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();

      // Inner silk background clipped to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 37, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = options.silkHex;
      ctx.fillRect(-40, -40, 80, 80);

      // Distinct silk pattern per jockey
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      if (options.pattern === 'stripes') {
        for (let sx = -36; sx < 40; sx += 16) {
          ctx.fillRect(sx, -40, 7, 80);
        }
      } else if (options.pattern === 'chevron') {
        ctx.beginPath();
        ctx.moveTo(-40, 10);
        ctx.lineTo(0, -18);
        ctx.lineTo(40, 10);
        ctx.lineTo(40, 26);
        ctx.lineTo(0, -2);
        ctx.lineTo(-40, 26);
        ctx.closePath();
        ctx.fill();
      } else if (options.pattern === 'diamonds') {
        for (let dx = -24; dx <= 24; dx += 24) {
          for (let dy = -24; dy <= 24; dy += 24) {
            ctx.beginPath();
            ctx.moveTo(dx, dy - 9);
            ctx.lineTo(dx + 9, dy);
            ctx.lineTo(dx, dy + 9);
            ctx.lineTo(dx - 9, dy);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else if (options.pattern === 'stars') {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
        ctx.beginPath();
        ctx.arc(-18, -16, 6, 0, Math.PI * 2);
        ctx.arc(20, -14, 5, 0, Math.PI * 2);
        ctx.arc(0, 22, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (options.pattern === 'flames') {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.38)';
        ctx.beginPath();
        ctx.moveTo(-38, 38);
        ctx.lineTo(-16, -8 - (f % 2) * 8);
        ctx.lineTo(0, 12);
        ctx.lineTo(18, -14 + (f % 2) * 6);
        ctx.lineTo(38, 38);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Jockey student photo (circular cover-cropped) or emoji avatar centered inside medallion
      if (hasReadyPhoto && photoImg) {
        const radius = 32;
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 1, radius, 0, Math.PI * 2);
        ctx.clip();

        const iw = photoImg.naturalWidth;
        const ih = photoImg.naturalHeight;
        const targetSize = radius * 2;
        const scale = Math.max(targetSize / iw, targetSize / ih);
        const drawW = iw * scale;
        const drawH = ih * scale;
        ctx.drawImage(photoImg, -drawW / 2, 1 - drawH / 2, drawW, drawH);
        ctx.restore();

        // Crisp inner frame around photo
        ctx.beginPath();
        ctx.arc(0, 1, radius, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = options.isPlayer ? '#fef08a' : '#ffffff';
        ctx.stroke();
      } else {
        ctx.font = '38px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon || '🏇', 0, 3);
      }

      // Racing helmet peak arc at top of medallion
      ctx.fillStyle = options.accentHex;
      ctx.beginPath();
      ctx.arc(0, -4, 38, Math.PI * 1.12, Math.PI * 1.88);
      ctx.lineWidth = 6;
      ctx.strokeStyle = options.isPlayer ? '#fef08a' : '#ffffff';
      ctx.stroke();

      // Kinetic sparkle dot on peak stride frames 1 & 2
      if (f === 1 || f === 2) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(32, -28 + (f === 2 ? -3 : 2), 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  };

  renderFrames(currentIcon, null);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / frameCount, 1);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  const loadAndDrawPhoto = (photoUrl?: string) => {
    const seq = ++loadSeq;
    currentPhotoUrl = photoUrl;
    if (!photoUrl) {
      loadedPhotoImg = null;
      renderFrames(currentIcon, null);
      texture.needsUpdate = true;
      return;
    }

    const img = new Image();
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (disposed || seq !== loadSeq) return;
      loadedPhotoImg = img;
      renderFrames(currentIcon, img);
      texture.needsUpdate = true;
    };
    img.onerror = () => {
      if (disposed || seq !== loadSeq) return;
      loadedPhotoImg = null;
      renderFrames(currentIcon, null);
      texture.needsUpdate = true;
    };
    img.src = photoUrl;
  };

  if (options.avatarPhoto) {
    loadAndDrawPhoto(options.avatarPhoto);
  }

  return {
    texture,
    redraw: (nextIcon: string, nextPhoto?: string) => {
      currentIcon = nextIcon || '🏇';
      if (nextPhoto !== currentPhotoUrl) {
        loadAndDrawPhoto(nextPhoto);
      } else {
        renderFrames(currentIcon, loadedPhotoImg);
        texture.needsUpdate = true;
      }
    },
    dispose: () => {
      disposed = true;
      loadSeq += 1;
      loadedPhotoImg = null;
      texture.dispose();
    },
  };
}

