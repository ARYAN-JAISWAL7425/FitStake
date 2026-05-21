// In-browser photo content verification — TensorFlow.js, fully client-side.
// No API key, no upload to a third party, no cost. Models download once on first
// use and are cached by the browser.
//
// Two verifiers, picked by goal type:
//   • Object goals (water, diet, sleep) → COCO-SSD object detection. The
//     distinctive object (cup, plate, bed) must be present.
//   • Activity goals (strength, cardio)  → MoveNet pose detection. Confirms a
//     full body is visible AND in an active posture (not just standing for a
//     selfie). Cardio also accepts a bicycle via COCO-SSD.
//
// Both fail OPEN on model errors so a flaky load never blocks a real user —
// content checks are a deterrent layered on hash-dedupe, not a hard gate.

import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as poseDetection from '@tensorflow-models/pose-detection';

export type GoalTemplate = 'steps' | 'strength' | 'water' | 'sleep' | 'diet' | 'cardio';

const OBJECT_GOALS: GoalTemplate[] = ['water', 'diet', 'sleep', 'steps'];
const ACTIVITY_GOALS: GoalTemplate[] = ['strength', 'cardio'];

const EXPECTED_OBJECTS: Record<GoalTemplate, string[]> = {
  water: ['bottle', 'cup', 'wine glass'],
  diet: ['bowl', 'sandwich', 'apple', 'banana', 'orange', 'broccoli', 'carrot', 'pizza', 'donut', 'cake', 'dining table', 'fork', 'knife', 'spoon'],
  sleep: ['bed', 'person'],
  steps: ['person'],
  strength: ['person', 'sports ball', 'chair'],
  cardio: ['person', 'bicycle'],
};

const WANT_LABEL: Record<GoalTemplate, string> = {
  water: 'a glass or bottle of water',
  diet: 'a plate or bowl of food',
  strength: 'you mid-exercise (full body in frame)',
  cardio: 'you exercising or a bike',
  sleep: 'your bed',
  steps: 'you',
};

const OBJ_CONFIDENCE = 0.5;
const KP_CONFIDENCE = 0.3;

// ── Lazy singletons ──────────────────────────────────────────────────────────
let _objModel: Promise<cocoSsd.ObjectDetection> | null = null;
function objectModel() {
  if (!_objModel) _objModel = cocoSsd.load({ base: 'lite_mobilenet_v2' });
  return _objModel;
}

let _poseModel: Promise<poseDetection.PoseDetector> | null = null;
function poseModel() {
  if (!_poseModel) {
    _poseModel = poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    });
  }
  return _poseModel;
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

export type VerifyResult =
  | { ok: true; detected: string[] }
  | { ok: false; reason: 'no-match' | 'no-person' | 'standing' | 'error'; detected: string[]; wantLabel: string; hint?: string };

// ── Object path (COCO-SSD) ───────────────────────────────────────────────────
async function detectObjects(img: HTMLImageElement): Promise<string[]> {
  const model = await objectModel();
  const preds = await model.detect(img);
  return preds.filter((p) => p.score >= OBJ_CONFIDENCE).map((p) => p.class);
}

async function verifyObjectGoal(file: File, templateId: GoalTemplate): Promise<VerifyResult> {
  const img = await fileToImage(file);
  try {
    const detected = await detectObjects(img);
    const wanted = EXPECTED_OBJECTS[templateId] ?? [];
    if (detected.some((d) => wanted.includes(d))) return { ok: true, detected };
    return { ok: false, reason: 'no-match', detected, wantLabel: WANT_LABEL[templateId] };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

// ── Pose path (MoveNet) ──────────────────────────────────────────────────────
type KP = { x: number; y: number; score?: number; name?: string };

function angleAt(a: KP, vertex: KP, b: KP): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 === 0 || m2 === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180) / Math.PI;
}

/** Returns true if the pose shows an active (non-standing) posture. */
function isActivePosture(byName: Record<string, KP>, imgHeight: number): boolean {
  const ok = (n: string) => (byName[n]?.score ?? 0) > KP_CONFIDENCE;
  const mid = (a: KP, b: KP): KP => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  // a) Torso angle from vertical — bent over / horizontal (plank, pushup, deadlift).
  if (ok('left_shoulder') && ok('right_shoulder') && ok('left_hip') && ok('right_hip')) {
    const sh = mid(byName.left_shoulder, byName.right_shoulder);
    const hp = mid(byName.left_hip, byName.right_hip);
    const dx = Math.abs(hp.x - sh.x);
    const dy = Math.abs(hp.y - sh.y);
    const angleFromVertical = (Math.atan2(dx, dy) * 180) / Math.PI;
    if (angleFromVertical > 35) return true;
  }

  // b) Knee bend — squat / lunge.
  for (const side of ['left', 'right'] as const) {
    if (ok(`${side}_hip`) && ok(`${side}_knee`) && ok(`${side}_ankle`)) {
      const knee = angleAt(byName[`${side}_hip`], byName[`${side}_knee`], byName[`${side}_ankle`]);
      if (knee < 150) return true; // bent leg
    }
  }

  // c) Arms raised — wrist above shoulder (press, jumping jack, raised arms).
  for (const side of ['left', 'right'] as const) {
    if (ok(`${side}_wrist`) && ok(`${side}_shoulder`)) {
      if (byName[`${side}_wrist`].y < byName[`${side}_shoulder`].y - imgHeight * 0.03) return true;
    }
  }

  // d) Running stride / lifted leg — large vertical gap between the two ankles or knees.
  if (ok('left_ankle') && ok('right_ankle')) {
    if (Math.abs(byName.left_ankle.y - byName.right_ankle.y) > imgHeight * 0.12) return true;
  }
  if (ok('left_knee') && ok('right_knee')) {
    if (Math.abs(byName.left_knee.y - byName.right_knee.y) > imgHeight * 0.12) return true;
  }

  return false;
}

async function verifyActivityGoal(file: File, templateId: GoalTemplate): Promise<VerifyResult> {
  const img = await fileToImage(file);
  try {
    const detector = await poseModel();
    const poses = await detector.estimatePoses(img);
    const H = img.naturalHeight || img.height || 1;

    if (poses.length === 0 || !poses[0].keypoints) {
      // No person via pose — for cardio, give COCO-SSD a chance to spot a bike.
      if (templateId === 'cardio') {
        const objs = await detectObjects(img);
        if (objs.includes('bicycle')) return { ok: true, detected: objs };
      }
      return { ok: false, reason: 'no-person', detected: [], wantLabel: WANT_LABEL[templateId], hint: 'Make sure your whole body is in the frame.' };
    }

    const kps = poses[0].keypoints as KP[];
    const byName: Record<string, KP> = {};
    for (const k of kps) if (k.name) byName[k.name] = k;
    const visible = kps.filter((k) => (k.score ?? 0) > KP_CONFIDENCE).length;

    // Need enough of the body in frame (rules out face-only selfies).
    if (visible < 8) {
      if (templateId === 'cardio') {
        const objs = await detectObjects(img);
        if (objs.includes('bicycle')) return { ok: true, detected: objs };
      }
      return { ok: false, reason: 'no-person', detected: ['partial person'], wantLabel: WANT_LABEL[templateId], hint: 'Step back so the camera captures you head to toe.' };
    }

    if (isActivePosture(byName, H)) {
      return { ok: true, detected: ['active pose'] };
    }

    // Person fully in frame but standing still. Cardio: last chance for a bike.
    if (templateId === 'cardio') {
      const objs = await detectObjects(img);
      if (objs.includes('bicycle')) return { ok: true, detected: objs };
    }
    return {
      ok: false,
      reason: 'standing',
      detected: ['standing person'],
      wantLabel: WANT_LABEL[templateId],
      hint: 'Looks like you’re standing still — snap yourself mid-rep (squat, push-up, stride).',
    };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

// ── Public entry ─────────────────────────────────────────────────────────────
export async function verifyPhotoForGoal(file: File, templateId: GoalTemplate): Promise<VerifyResult> {
  try {
    if (ACTIVITY_GOALS.includes(templateId)) return await verifyActivityGoal(file, templateId);
    if (OBJECT_GOALS.includes(templateId)) return await verifyObjectGoal(file, templateId);
    return { ok: true, detected: [] }; // unknown type → don't block
  } catch {
    return { ok: true, detected: [] }; // model failure → fail open
  }
}
