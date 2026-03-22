import type { HumanMouseOptions } from './types.js';

export interface MouseDeltaStep {
    dx: number;
    dy: number;
    delayMs: number;
}

interface Point {
    x: number;
    y: number;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const easeInOutCubic = (t: number): number => (
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
);

const cubicBezier = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
    const oneMinusT = 1 - t;
    const a = oneMinusT ** 3;
    const b = 3 * (oneMinusT ** 2) * t;
    const c = 3 * oneMinusT * (t ** 2);
    const d = t ** 3;
    return {
        x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
        y: a * p0.y + b * p1.y + c * p2.y + d * p3.y
    };
};

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

export const createHumanMousePath = (
    dx: number,
    dy: number,
    options: HumanMouseOptions = {}
): MouseDeltaStep[] => {
    const distance = Math.hypot(dx, dy);
    if (distance < 1) {
        return [];
    }

    const durationMs = options.durationMs ?? clamp(Math.round(distance * 2.2), 140, 2200);
    const stepMsMin = options.stepMsMin ?? 6;
    const stepMsMax = options.stepMsMax ?? 16;
    const jitter = options.jitter ?? clamp(distance * 0.012, 0.2, 2.2);

    const estimatedSteps = clamp(Math.round(durationMs / ((stepMsMin + stepMsMax) / 2)), 12, 240);
    const perpendicularUnit = distance === 0 ? { x: 0, y: 0 } : { x: -dy / distance, y: dx / distance };
    const bend = clamp(distance * randomRange(0.08, 0.22), 8, 180);
    const bendSign = Math.random() < 0.5 ? -1 : 1;

    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: dx, y: dy };
    const c1: Point = {
        x: dx * randomRange(0.2, 0.4) + perpendicularUnit.x * bend * bendSign,
        y: dy * randomRange(0.2, 0.4) + perpendicularUnit.y * bend * bendSign
    };
    const c2: Point = {
        x: dx * randomRange(0.6, 0.85) - perpendicularUnit.x * bend * bendSign * randomRange(0.35, 0.9),
        y: dy * randomRange(0.6, 0.85) - perpendicularUnit.y * bend * bendSign * randomRange(0.35, 0.9)
    };

    const points: Point[] = [];
    for (let i = 0; i <= estimatedSteps; i++) {
        const t = i / estimatedSteps;
        const eased = easeInOutCubic(t);
        const p = cubicBezier(start, c1, c2, end, eased);
        const noiseScale = (1 - t) * jitter;
        points.push({
            x: p.x + randomRange(-noiseScale, noiseScale),
            y: p.y + randomRange(-noiseScale, noiseScale)
        });
    }

    points[0] = { ...start };
    points[points.length - 1] = { ...end };

    const steps: MouseDeltaStep[] = [];
    let prev: Point = points[0];
    let residualX = 0;
    let residualY = 0;

    for (let i = 1; i < points.length; i++) {
        const current = points[i];
        const rawDx = (current.x - prev.x) + residualX;
        const rawDy = (current.y - prev.y) + residualY;

        const roundedDx = Math.round(rawDx);
        const roundedDy = Math.round(rawDy);
        residualX = rawDx - roundedDx;
        residualY = rawDy - roundedDy;

        if (roundedDx !== 0 || roundedDy !== 0) {
            steps.push({
                dx: roundedDx,
                dy: roundedDy,
                delayMs: Math.round(randomRange(stepMsMin, stepMsMax))
            });
        }

        prev = current;
    }

    const movedX = steps.reduce((sum, step) => sum + step.dx, 0);
    const movedY = steps.reduce((sum, step) => sum + step.dy, 0);
    const correctionX = dx - movedX;
    const correctionY = dy - movedY;
    if (correctionX !== 0 || correctionY !== 0) {
        steps.push({
            dx: correctionX,
            dy: correctionY,
            delayMs: Math.round(randomRange(stepMsMin, stepMsMax))
        });
    }

    return steps;
};
