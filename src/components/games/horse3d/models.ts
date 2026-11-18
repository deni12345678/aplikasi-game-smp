import * as THREE from 'three';
import {
  createBoostStripTexture,
  createClockTowerTexture,
  createContactShadowTexture,
  createCrowdTexture,
  createFinishBannerTexture,
  createGrandstandFacadeTexture,
  createJockeyAvatarSpriteSheet,
  createMudPatchTexture,
  createNameplateTexture,
  createOutfieldGrassTexture,
  createTurfTexture,
  type JockeySilkPattern,
} from './textures';

export interface HorseActorRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  neckPivot: THREE.Group;
  tailPivot: THREE.Group;
  jockeyPivot: THREE.Group;
  whipPivot: THREE.Group;
  legs: Array<{
    upper: THREE.Group;
    lower: THREE.Group;
    phaseOffset: number;
  }>;
  shadowDisc: THREE.Mesh;
  nameSprite: THREE.Sprite;
  avatarSprite: THREE.Sprite;
  avatarTexture: THREE.CanvasTexture;
  setAvatarIcon: (icon: string) => void;
  dispose: () => void;
}

export interface HorseRigStyle {
  label: string;
  coatColor: number;
  maneColor: number;
  silkColor: number;
  helmetColor: number;
  accentHex: string;
  isPlayer: boolean;
  avatarIcon?: string;
  silkHex?: string;
  silkPattern?: JockeySilkPattern;
}

export const HORSE_TRACK_LENGTH = 1200; // meters along -Z
export const TRACK_HALF_WIDTH = 14.5;
export const LANE_X = [-9, -4.5, 0, 4.5, 9] as const;

export interface TrackFeature {
  id: string;
  type: 'boost' | 'mud';
  x: number;
  z: number; // negative meters along -Z
  halfW: number;
  halfL: number;
}

export function createHorseAndJockey(
  style: HorseRigStyle,
  contactShadowTex: THREE.Texture
): HorseActorRig {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T) => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T) => {
    disposables.push(m);
    return m;
  };

  // Materials with realistic roughness/metalness contrast (>= 0.25 spread between skin, leather, silks, glossy helmet)
  const coatMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: style.coatColor,
      roughness: 0.56,
      metalness: 0.04,
    })
  );
  const maneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: style.maneColor,
      roughness: 0.85,
      metalness: 0.0,
    })
  );
  const hoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.35,
      metalness: 0.1,
    })
  );
  const saddleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2a1a10,
      roughness: 0.38,
      metalness: 0.08,
    })
  );
  const clothMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.82,
      metalness: 0.0,
    })
  );
  const silkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: style.silkColor,
      roughness: 0.64,
      metalness: 0.05,
    })
  );
  const breechesMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.78,
      metalness: 0.0,
    })
  );
  const bootMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.28,
      metalness: 0.14,
    })
  );
  const helmetMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: style.helmetColor,
      roughness: 0.2,
      metalness: 0.18,
    })
  );
  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd99b72,
      roughness: 0.72,
      metalness: 0.0,
    })
  );

  // Body pivot centered at horse barrel height (y = 1.18m)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, 1.18, 0);
  root.add(bodyPivot);

  // 1. Primary sculpted barrel torso (facing -Z)
  const torsoGeo = trackGeo(new THREE.CapsuleGeometry(0.42, 1.18, 8, 16));
  torsoGeo.rotateX(Math.PI / 2);
  const torso = new THREE.Mesh(torsoGeo, coatMat);
  torso.scale.set(0.92, 1.06, 1.05);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Muscular hindquarters (prominent in third-person rear camera!)
  const rumpGeo = trackGeo(new THREE.SphereGeometry(0.45, 16, 14));
  const rump = new THREE.Mesh(rumpGeo, coatMat);
  rump.position.set(0, 0.04, 0.54);
  rump.scale.set(0.95, 1.02, 1.08);
  rump.castShadow = true;
  rump.receiveShadow = true;
  bodyPivot.add(rump);

  // Chest / shoulder mass
  const chestGeo = trackGeo(new THREE.SphereGeometry(0.42, 14, 12));
  const chest = new THREE.Mesh(chestGeo, coatMat);
  chest.position.set(0, 0.03, -0.52);
  chest.scale.set(0.88, 1.04, 1.02);
  chest.castShadow = true;
  bodyPivot.add(chest);

  // 2. Neck & Head group (pivoting at shoulder)
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.22, -0.68);
  neckPivot.rotation.x = 0.42; // reaching forward into gallop
  bodyPivot.add(neckPivot);

  const neckGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.28, 0.78, 12));
  const neckMesh = new THREE.Mesh(neckGeo, coatMat);
  neckMesh.position.set(0, 0.34, -0.06);
  neckMesh.rotation.x = 0.32;
  neckMesh.castShadow = true;
  neckPivot.add(neckMesh);

  // Mane crest along back of neck
  const maneGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.66, 0.16));
  const maneMesh = new THREE.Mesh(maneGeo, maneMat);
  maneMesh.position.set(0, 0.36, 0.1);
  maneMesh.rotation.x = 0.32;
  neckPivot.add(maneMesh);

  // Head & muzzle
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.7, -0.2);
  headGroup.rotation.x = -0.38;
  neckPivot.add(headGroup);

  const skullGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.25, 0.36));
  const skull = new THREE.Mesh(skullGeo, coatMat);
  skull.castShadow = true;
  headGroup.add(skull);

  const muzzleGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 10));
  muzzleGeo.rotateX(Math.PI / 2);
  const muzzle = new THREE.Mesh(muzzleGeo, coatMat);
  muzzle.position.set(0, -0.04, -0.26);
  muzzle.castShadow = true;
  headGroup.add(muzzle);

  // Pointed ears
  const earGeo = trackGeo(new THREE.ConeGeometry(0.045, 0.14, 6));
  const earL = new THREE.Mesh(earGeo, coatMat);
  earL.position.set(-0.08, 0.17, 0.08);
  earL.rotation.z = 0.15;
  const earR = new THREE.Mesh(earGeo, coatMat);
  earR.position.set(0.08, 0.17, 0.08);
  earR.rotation.z = -0.15;
  headGroup.add(earL, earR);

  // 3. Flowing Tail group (visible right in front of chase camera!)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.22, 0.92);
  bodyPivot.add(tailPivot);

  const tailTopGeo = trackGeo(new THREE.ConeGeometry(0.11, 0.56, 8));
  tailTopGeo.rotateX(-Math.PI / 2.25);
  const tailTop = new THREE.Mesh(tailTopGeo, maneMat);
  tailTop.position.set(0, -0.14, 0.24);
  tailTop.castShadow = true;
  tailPivot.add(tailTop);

  const tailTipGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.44, 8));
  tailTipGeo.rotateX(-Math.PI / 1.85);
  const tailTip = new THREE.Mesh(tailTipGeo, maneMat);
  tailTip.position.set(0, -0.32, 0.44);
  tailPivot.add(tailTip);

  // 4. Saddle & white race cloth
  const clothGeo = trackGeo(new THREE.BoxGeometry(0.84, 0.3, 0.64));
  const clothMesh = new THREE.Mesh(clothGeo, clothMat);
  clothMesh.position.set(0, 0.24, 0.04);
  clothMesh.castShadow = true;
  bodyPivot.add(clothMesh);

  const saddleGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.14, 0.52));
  const saddleMesh = new THREE.Mesh(saddleGeo, saddleMat);
  saddleMesh.position.set(0, 0.4, 0.02);
  saddleMesh.castShadow = true;
  bodyPivot.add(saddleMesh);

  // 5. Four Articulated Legs (Upper + Lower + Hoof)
  const legSpecs = [
    { x: -0.22, z: -0.58, phase: 0.0, isHind: false },
    { x: 0.22, z: -0.58, phase: Math.PI * 0.34, isHind: false },
    { x: -0.24, z: 0.62, phase: Math.PI * 1.05, isHind: true },
    { x: 0.24, z: 0.62, phase: Math.PI * 1.38, isHind: true },
  ];

  const upperLegGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.075, 0.54, 10));
  const lowerLegGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.052, 0.5, 10));
  const hoofGeo = trackGeo(new THREE.CylinderGeometry(0.062, 0.074, 0.11, 10));

  const legs = legSpecs.map((spec) => {
    const upper = new THREE.Group();
    upper.position.set(spec.x, -0.18, spec.z);
    bodyPivot.add(upper);

    const upperMesh = new THREE.Mesh(upperLegGeo, coatMat);
    upperMesh.position.set(0, -0.25, 0);
    upperMesh.castShadow = true;
    upper.add(upperMesh);

    const lower = new THREE.Group();
    lower.position.set(0, -0.5, 0);
    upper.add(lower);

    const lowerMesh = new THREE.Mesh(lowerLegGeo, coatMat);
    lowerMesh.position.set(0, -0.24, 0);
    lowerMesh.castShadow = true;
    lower.add(lowerMesh);

    const hoofMesh = new THREE.Mesh(hoofGeo, hoofMat);
    hoofMesh.position.set(0, -0.51, -0.01);
    hoofMesh.castShadow = true;
    lower.add(hoofMesh);

    return { upper, lower, phaseOffset: spec.phase };
  });

  // 6. Articulated Jockey Group (crouched forward like real thoroughbred racing)
  const jockeyPivot = new THREE.Group();
  jockeyPivot.position.set(0, 0.44, -0.02);
  bodyPivot.add(jockeyPivot);

  // Left & right legs gripping saddle in white breeches + tall black boots
  const thighGeo = trackGeo(new THREE.CapsuleGeometry(0.085, 0.26, 6, 10));
  const bootGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.055, 0.36, 10));
  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(thighGeo, breechesMat);
    thigh.position.set(side * 0.32, 0.04, -0.04);
    thigh.rotation.z = side * 0.48;
    thigh.rotation.x = 0.65;
    thigh.castShadow = true;
    jockeyPivot.add(thigh);

    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(side * 0.42, -0.16, 0.08);
    boot.rotation.x = -0.35;
    boot.castShadow = true;
    jockeyPivot.add(boot);
  }

  // Jockey torso leaned forward in vibrant silks
  const torsoJockeyGroup = new THREE.Group();
  torsoJockeyGroup.position.set(0, 0.14, 0.04);
  torsoJockeyGroup.rotation.x = -0.78;
  jockeyPivot.add(torsoJockeyGroup);

  const jTorsoGeo = trackGeo(new THREE.CapsuleGeometry(0.17, 0.34, 8, 12));
  const jTorso = new THREE.Mesh(jTorsoGeo, silkMat);
  jTorso.position.set(0, 0.22, 0);
  jTorso.scale.set(1.18, 1.0, 0.82);
  jTorso.castShadow = true;
  torsoJockeyGroup.add(jTorso);

  // Jockey head + glossy racing helmet
  const jHead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.125, 12, 10)), skinMat);
  jHead.position.set(0, 0.53, -0.02);
  jHead.castShadow = true;
  torsoJockeyGroup.add(jHead);

  const jHelmet = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.138, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.68)),
    helmetMat
  );
  jHelmet.position.set(0, 0.55, -0.02);
  jHelmet.castShadow = true;
  torsoJockeyGroup.add(jHelmet);

  // Helmet visor
  const visorGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.025, 0.1));
  const visor = new THREE.Mesh(visorGeo, helmetMat);
  visor.position.set(0, 0.56, -0.14);
  torsoJockeyGroup.add(visor);

  // Right arm holding reins
  const armGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.044, 0.4, 8));
  const rightArm = new THREE.Mesh(armGeo, silkMat);
  rightArm.position.set(0.24, 0.26, -0.16);
  rightArm.rotation.x = 0.85;
  rightArm.rotation.z = -0.25;
  rightArm.castShadow = true;
  torsoJockeyGroup.add(rightArm);

  // Left arm + animated riding crop (whip!)
  const whipPivot = new THREE.Group();
  whipPivot.position.set(-0.24, 0.34, -0.04);
  torsoJockeyGroup.add(whipPivot);

  const leftArm = new THREE.Mesh(armGeo, silkMat);
  leftArm.position.set(-0.02, -0.1, -0.12);
  leftArm.rotation.x = 0.62;
  leftArm.rotation.z = 0.25;
  leftArm.castShadow = true;
  whipPivot.add(leftArm);

  const cropShaftGeo = trackGeo(new THREE.CylinderGeometry(0.014, 0.008, 0.62, 6));
  const cropShaft = new THREE.Mesh(cropShaftGeo, hoofMat);
  cropShaft.position.set(-0.06, -0.38, 0.02);
  cropShaft.rotation.x = -0.45;
  cropShaft.rotation.z = 0.2;
  whipPivot.add(cropShaft);

  // 7. Grounded Contact Shadow Disc directly under hooves
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(1.75, 2.75));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    })
  );
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.set(0, 0.03, 0);
  root.add(shadowDisc);

  // 8. Floating Nameplate Sprite above jockey
  const nameTex = createNameplateTexture(style.label, style.accentHex, style.isPlayer);
  disposables.push(nameTex);
  const nameMat = trackMat(
    new THREE.SpriteMaterial({
      map: nameTex,
      transparent: true,
      depthTest: true,
    })
  );
  const nameSprite = new THREE.Sprite(nameMat);
  nameSprite.position.set(0, 2.38, 0);
  nameSprite.scale.set(1.7, 0.38, 1);
  root.add(nameSprite);

  // 9. Distinct 4-Frame Animated Jockey Avatar Sprite above nameplate
  const avatarHandle = createJockeyAvatarSpriteSheet({
    avatarIcon: style.avatarIcon || '🏇',
    silkHex: style.silkHex || style.accentHex,
    accentHex: style.accentHex,
    pattern: style.silkPattern || 'stripes',
    isPlayer: style.isPlayer,
  });
  disposables.push(avatarHandle.texture);
  const avatarMat = trackMat(
    new THREE.SpriteMaterial({
      map: avatarHandle.texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    })
  );
  const avatarSprite = new THREE.Sprite(avatarMat);
  avatarSprite.position.set(0, 2.94, 0);
  avatarSprite.scale.set(0.74, 0.74, 1);
  root.add(avatarSprite);

  return {
    root,
    bodyPivot,
    neckPivot,
    tailPivot,
    jockeyPivot,
    whipPivot,
    legs,
    shadowDisc,
    nameSprite,
    avatarSprite,
    avatarTexture: avatarHandle.texture,
    setAvatarIcon: avatarHandle.redraw,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function animateHorseGallop(
  rig: HorseActorRig,
  stridePhase: number,
  speedNorm: number,
  whipTimer: number,
  leanAngle: number
) {
  const amp = 0.45 + speedNorm * 0.42;
  // Vertical suspension bounce on gallop cycle
  const bounce = Math.sin(stridePhase * 2) * (0.045 + speedNorm * 0.045);
  rig.bodyPivot.position.y = 1.18 + Math.max(-0.04, bounce);
  rig.bodyPivot.rotation.x = Math.cos(stridePhase * 2) * 0.045 * speedNorm;
  rig.bodyPivot.rotation.z = leanAngle * 0.14;

  // Neck head-nod synced to stride
  rig.neckPivot.rotation.x = 0.38 + Math.sin(stridePhase + 0.4) * (0.08 + speedNorm * 0.09);

  // Flowing tail lift & sway
  rig.tailPivot.rotation.x = 0.2 + speedNorm * 0.45 + Math.sin(stridePhase * 2) * 0.12;
  rig.tailPivot.rotation.y = Math.cos(stridePhase) * 0.12;

  // Jockey tucks tighter at high speed
  rig.jockeyPivot.rotation.x = -0.08 - speedNorm * 0.22;
  rig.jockeyPivot.position.y = 0.44 - Math.sin(stridePhase * 2) * 0.03;

  // Riding crop whip snap
  if (whipTimer > 0) {
    rig.whipPivot.rotation.x = Math.sin(whipTimer * 18) * 0.85;
  } else {
    rig.whipPivot.rotation.x = Math.sin(stridePhase) * 0.1;
  }

  // 4-beat gallop leg articulation
  for (const leg of rig.legs) {
    const p = stridePhase + leg.phaseOffset;
    const swing = Math.sin(p) * amp;
    const kneeFlex = Math.max(0, -Math.cos(p)) * (0.65 + speedNorm * 0.45);
    leg.upper.rotation.x = swing;
    leg.lower.rotation.x = -kneeFlex;
  }

  // Speed-driven animated jockey avatar sprite (UV frame step + bob + wind tilt + kinetic pulse)
  const twoPi = Math.PI * 2;
  const wrappedPhase = ((stridePhase % twoPi) + twoPi) % twoPi;
  const frameIdx = speedNorm > 0.08 ? Math.floor((wrappedPhase / twoPi) * 4) & 3 : 0;
  rig.avatarTexture.offset.x = frameIdx * 0.25;
  rig.avatarSprite.position.y = 2.94 + Math.sin(stridePhase * 2) * (0.015 + speedNorm * 0.08);
  rig.avatarSprite.material.rotation =
    -leanAngle * 0.16 + Math.cos(stridePhase) * (0.015 + speedNorm * 0.055);
  const spritePulse =
    1 +
    (whipTimer > 0 ? 0.18 : speedNorm * 0.14) +
    Math.sin(stridePhase * 2) * 0.045 * speedNorm;
  rig.avatarSprite.scale.set(0.74 * spritePulse, 0.74 * spritePulse, 1);

  // Shadow disc breathes subtly with vertical bounce
  const shadowScale = 1 - Math.max(0, bounce) * 0.9;
  rig.shadowDisc.scale.set(shadowScale, 1, shadowScale);
}

export interface TrackEnvironment {
  features: TrackFeature[];
  crowdMaterials: THREE.MeshStandardMaterial[];
  contactShadowTex: THREE.Texture;
  dispose: () => void;
}

export function createTrackEnvironment(
  scene: THREE.Scene,
  maxAnisotropy: number,
  seedFeatures: TrackFeature[]
): TrackEnvironment {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const turfTex = track(createTurfTexture(maxAnisotropy));
  const outfieldTex = track(createOutfieldGrassTexture(maxAnisotropy));
  const crowdTex = track(createCrowdTexture(maxAnisotropy));
  const facadeTex = track(createGrandstandFacadeTexture(maxAnisotropy));
  const clockTex = track(createClockTowerTexture(maxAnisotropy));
  const finishTex = track(createFinishBannerTexture(maxAnisotropy));
  const boostTex = track(createBoostStripTexture(maxAnisotropy));
  const mudTex = track(createMudPatchTexture(maxAnisotropy));
  const contactShadowTex = track(createContactShadowTexture());

  // 1. Surrounding countryside meadow ground plane (prevents floating world edge)
  const meadowGeo = track(new THREE.PlaneGeometry(520, 1750));
  meadowGeo.rotateX(-Math.PI / 2);
  const meadowMat = track(
    new THREE.MeshStandardMaterial({
      map: outfieldTex,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  const meadow = new THREE.Mesh(meadowGeo, meadowMat);
  meadow.position.set(0, -0.06, -620);
  meadow.receiveShadow = true;
  scene.add(meadow);

  // 2. Main Striped Mowed Turf Straightaway (30m wide, 1400m long)
  const turfGeo = track(new THREE.PlaneGeometry(TRACK_HALF_WIDTH * 2, 1420));
  turfGeo.rotateX(-Math.PI / 2);
  const turfMat = track(
    new THREE.MeshStandardMaterial({
      map: turfTex,
      roughness: 0.88,
      metalness: 0.0,
    })
  );
  const turf = new THREE.Mesh(turfGeo, turfMat);
  turf.position.set(0, 0, -610);
  turf.receiveShadow = true;
  scene.add(turf);

  // 3. White Post-and-Rail Fences on both sides (InstancedMesh)
  const postGeo = track(new THREE.BoxGeometry(0.14, 1.15, 0.14));
  const railGeo = track(new THREE.BoxGeometry(0.08, 0.09, 6.0));
  const whitePaintMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.08,
    })
  );

  const zStart = 40;
  const zEnd = -1260;
  const step = 6;
  const segments = Math.floor((zStart - zEnd) / step);
  const totalPosts = segments * 2;
  const postInst = new THREE.InstancedMesh(postGeo, whitePaintMat, totalPosts);
  const railInst = new THREE.InstancedMesh(railGeo, whitePaintMat, segments * 4);
  postInst.castShadow = true;
  railInst.castShadow = true;

  const dummy = new THREE.Object3D();
  let pIdx = 0;
  let rIdx = 0;
  for (let i = 0; i < segments; i++) {
    const z = zStart - i * step;
    for (const sideX of [-TRACK_HALF_WIDTH, TRACK_HALF_WIDTH]) {
      dummy.position.set(sideX, 0.57, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      postInst.setMatrixAt(pIdx++, dummy.matrix);

      // Upper and middle horizontal rails
      for (const railY of [0.98, 0.55]) {
        dummy.position.set(sideX, railY, z - step / 2);
        dummy.updateMatrix();
        railInst.setMatrixAt(rIdx++, dummy.matrix);
      }
    }
  }
  postInst.instanceMatrix.needsUpdate = true;
  railInst.instanceMatrix.needsUpdate = true;
  postInst.computeBoundingSphere();
  railInst.computeBoundingSphere();
  scene.add(postInst, railInst);

  // 4. Left Side (-X) Multi-tier Ascot-style Grandstand & Spectator Crowd Terraces
  const crowdMat = track(
    new THREE.MeshStandardMaterial({
      map: crowdTex,
      roughness: 0.85,
      metalness: 0.0,
    })
  );
  const facadeMat = track(
    new THREE.MeshStandardMaterial({
      map: facadeTex,
      roughness: 0.45,
      metalness: 0.22,
    })
  );
  const roofMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.35,
    })
  );
  const concreteMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd6d3cb,
      roughness: 0.78,
      metalness: 0.02,
    })
  );

  // Place 3 grandstand complexes along the left flank so crowd & tiers accompany the entire race
  const grandstandZPositions = [-140, -600, -1060];
  for (const gz of grandstandZPositions) {
    const gGroup = new THREE.Group();
    gGroup.position.set(-22, 0, gz);

    // Lower angled crowd terrace
    const terraceGeo = track(new THREE.BoxGeometry(8, 5.2, 220));
    const terrace = new THREE.Mesh(terraceGeo, crowdMat);
    terrace.position.set(2.5, 2.3, 0);
    terrace.rotation.z = -0.34;
    terrace.receiveShadow = true;
    gGroup.add(terrace);

    // Concrete apron wall along rail
    const apronGeo = track(new THREE.BoxGeometry(1.2, 1.3, 224));
    const apron = new THREE.Mesh(apronGeo, concreteMat);
    apron.position.set(5.8, 0.65, 0);
    gGroup.add(apron);

    // 4-tier glass & balcony grandstand main building behind terrace
    const mainStandGeo = track(new THREE.BoxGeometry(14, 21, 210));
    const mainStand = new THREE.Mesh(mainStandGeo, facadeMat);
    mainStand.position.set(-7.5, 10.5, 0);
    mainStand.castShadow = true;
    mainStand.receiveShadow = true;
    gGroup.add(mainStand);

    // Cantilevered steel roof overhang
    const roofGeo = track(new THREE.BoxGeometry(18, 1.4, 214));
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-6.0, 21.6, 0);
    roof.castShadow = true;
    gGroup.add(roof);

    scene.add(gGroup);
  }

  // Green terraced slope berm connecting grandstands smoothly
  const bermGeo = track(new THREE.BoxGeometry(12, 4.5, 1300));
  const berm = new THREE.Mesh(bermGeo, meadowMat);
  berm.position.set(-24, 1.6, -610);
  berm.rotation.z = -0.28;
  berm.receiveShadow = true;
  scene.add(berm);

  // 5. Right Side (+X) Clock / Judge Towers & Scoreboards (matching right-side landmark in screenshot)
  const towerMat = track(
    new THREE.MeshStandardMaterial({
      map: clockTex,
      roughness: 0.65,
      metalness: 0.08,
    })
  );
  const domeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.35,
      metalness: 0.4,
    })
  );
  for (const tz of [-240, -680, -1120]) {
    const tower = new THREE.Group();
    tower.position.set(20.5, 0, tz);

    const baseGeo = track(new THREE.BoxGeometry(5.5, 12.5, 4.2));
    const base = new THREE.Mesh(baseGeo, towerMat);
    base.position.y = 6.25;
    base.castShadow = true;
    tower.add(base);

    const roofCapGeo = track(new THREE.ConeGeometry(3.8, 3.2, 4));
    const roofCap = new THREE.Mesh(roofCapGeo, domeMat);
    roofCap.position.y = 14.1;
    roofCap.rotation.y = Math.PI / 4;
    roofCap.castShadow = true;
    tower.add(roofCap);

    scene.add(tower);
  }

  // 6. Distant Lush Treeline Belt (`InstancedMesh` with varied scales & color tints along right & horizon)
  const trunkGeo = track(new THREE.CylinderGeometry(0.28, 0.42, 3.4, 7));
  const trunkMat = track(
    new THREE.MeshStandardMaterial({ color: 0x5c3d24, roughness: 0.9, metalness: 0 })
  );
  const crownGeo = track(new THREE.DodecahedronGeometry(2.8, 1));
  const crownMat = track(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 })
  );

  const treeCoords: Array<{ x: number; z: number; s: number; tint: number }> = [];
  for (let i = 0; i < 160; i++) {
    const z = 40 - i * 8.4;
    const xRight = 32 + ((i * 19) % 45);
    const s = 0.85 + ((i * 7) % 10) * 0.045;
    const tint = i % 3 === 0 ? 0x2f7d24 : i % 3 === 1 ? 0x3b8c2a : 0x26691e;
    treeCoords.push({ x: xRight, z, s, tint });
  }
  // Horizon treeline beyond finish line
  for (let x = -90; x <= 90; x += 6.5) {
    treeCoords.push({
      x,
      z: -1295 - (Math.abs(x) % 12),
      s: 1.05 + (Math.abs(x) % 5) * 0.08,
      tint: x % 2 === 0 ? 0x2d7822 : 0x388827,
    });
  }

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treeCoords.length);
  const colorObj = new THREE.Color();
  treeCoords.forEach((tc, idx) => {
    dummy.position.set(tc.x, 1.6 * tc.s, tc.z);
    dummy.scale.set(tc.s, tc.s, tc.s);
    dummy.rotation.set(0, idx * 0.6, 0);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(tc.x, 4.4 * tc.s, tc.z);
    dummy.scale.set(tc.s * 1.1, tc.s * 1.25, tc.s * 1.1);
    dummy.updateMatrix();
    crownInst.setMatrixAt(idx, dummy.matrix);
    crownInst.setColorAt(idx, colorObj.setHex(tc.tint));
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  scene.add(trunkInst, crownInst);

  // 7. Furlong Distance Marker Poles (every 200m)
  const poleGeo = track(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8));
  const boardGeo = track(new THREE.BoxGeometry(2.2, 0.9, 0.14));
  const poleMat = track(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }));
  for (let dist = 200; dist < HORSE_TRACK_LENGTH; dist += 200) {
    const markerGroup = new THREE.Group();
    markerGroup.position.set(TRACK_HALF_WIDTH + 1.4, 0, -dist);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.6;
    markerGroup.add(pole);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 104;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 256, 104);
    sCtx.strokeStyle = '#fbbf24';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(4, 4, 248, 96);
    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 44px monospace';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(`${HORSE_TRACK_LENGTH - dist}m`, 128, 54);
    const signTex = track(new THREE.CanvasTexture(signCanvas));
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signMat = track(new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 }));
    const board = new THREE.Mesh(boardGeo, signMat);
    board.position.y = 2.9;
    markerGroup.add(board);
    scene.add(markerGroup);
  }

  // 8. Checkered Finish Arch & White Line at z = -1200
  const finishGroup = new THREE.Group();
  finishGroup.position.set(0, 0, -HORSE_TRACK_LENGTH);

  const pillarGeo = track(new THREE.CylinderGeometry(0.32, 0.38, 7.2, 12));
  const pillarL = new THREE.Mesh(pillarGeo, whitePaintMat);
  pillarL.position.set(-TRACK_HALF_WIDTH, 3.6, 0);
  pillarL.castShadow = true;
  const pillarR = new THREE.Mesh(pillarGeo, whitePaintMat);
  pillarR.position.set(TRACK_HALF_WIDTH, 3.6, 0);
  pillarR.castShadow = true;

  const bannerGeo = track(new THREE.BoxGeometry(TRACK_HALF_WIDTH * 2 + 1.2, 2.4, 0.5));
  const bannerMat = track(
    new THREE.MeshStandardMaterial({
      map: finishTex,
      roughness: 0.45,
      metalness: 0.08,
    })
  );
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 6.2, 0);
  banner.castShadow = true;

  // Painted white finish strip across turf
  const lineGeo = track(new THREE.PlaneGeometry(TRACK_HALF_WIDTH * 2, 1.3));
  lineGeo.rotateX(-Math.PI / 2);
  const lineMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const finishLine = new THREE.Mesh(lineGeo, lineMat);
  finishLine.position.set(0, 0.02, 0);
  finishGroup.add(pillarL, pillarR, banner, finishLine);
  scene.add(finishGroup);

  // 9. Tactical Turf Boost Strips & Mud Patches along lanes
  const boostMat = track(
    new THREE.MeshStandardMaterial({
      map: boostTex,
      roughness: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const mudMat = track(
    new THREE.MeshStandardMaterial({
      map: mudTex,
      transparent: true,
      roughness: 0.96,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  for (const feat of seedFeatures) {
    const fGeo = track(new THREE.PlaneGeometry(feat.halfW * 2, feat.halfL * 2));
    fGeo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(fGeo, feat.type === 'boost' ? boostMat : mudMat);
    mesh.position.set(feat.x, 0.022, feat.z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  return {
    features: seedFeatures,
    crowdMaterials: [crowdMat],
    contactShadowTex,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
