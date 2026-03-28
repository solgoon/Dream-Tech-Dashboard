import * as THREE from 'three';
import { LAND_POLYGONS } from '../data/coastlines.js';

/**
 * Draws Natural Earth land polygons onto an offscreen canvas
 * and returns a THREE.CanvasTexture for use on the globe.
 */
export function createEarthCanvasTexture() {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Ocean — near-black
  ctx.fillStyle = '#06060c';
  ctx.fillRect(0, 0, W, H);

  // Convert lng/lat → canvas x/y (equirectangular projection)
  const toX = (lng) => ((lng + 180) / 360) * W;
  const toY = (lat) => ((90 - lat) / 180) * H;

  // Draw land polygons — medium-light gray
  ctx.fillStyle = '#8c8c96';
  ctx.strokeStyle = '#9e9ea8';
  ctx.lineWidth = 1.2;

  for (const ring of LAND_POLYGONS) {
    ctx.beginPath();
    let prevX = null;
    let skipped = false;

    for (let i = 0; i < ring.length; i++) {
      const x = toX(ring[i][0]);
      const y = toY(ring[i][1]);

      // Skip segments that cross the antimeridian (huge x-jump)
      if (prevX !== null && Math.abs(x - prevX) > W * 0.5) {
        ctx.lineTo(x > W * 0.5 ? 0 : W, y);
        ctx.moveTo(x, y);
        skipped = true;
      } else if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      prevX = x;
    }

    ctx.closePath();
    ctx.fill('evenodd');
    if (!skipped) ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}
