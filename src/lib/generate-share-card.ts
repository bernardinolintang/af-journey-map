interface RegionEntry {
  region: string;
  visited: number;
  total: number;
  pct: number;
}

export async function generateShareCard(
  visited: number,
  total: number,
  percentage: number,
  regionStats: RegionEntry[]
): Promise<Blob> {
  const W = 420;
  const H = 520;
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;   // 2x for retina
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#0C0F1A';
  ctx.fillRect(0, 0, W, H);

  // Gradient mesh
  const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 300);
  g1.addColorStop(0, 'rgba(124,66,237,0.28)');
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W, H, 0, W, H, 260);
  g2.addColorStop(0, 'rgba(245,166,35,0.14)');
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // ── AF Logo ──────────────────────────────────────────────────────────────
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Draw logo contained within 160×60 at center-top
      const maxW = 160, maxH = 60;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const iw = img.width * scale;
      const ih = img.height * scale;
      ctx.drawImage(img, (W - iw) / 2, 32, iw, ih);
      resolve();
    };
    img.onerror = () => resolve(); // continue even if logo fails
    img.src = '/af-logo.png';
  });

  // ── "I've visited" label ─────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '500 15px "DM Sans", system-ui';
  ctx.textAlign = 'center';
  ctx.fillText("I've visited", W / 2, 118);

  // ── Big number ───────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 86px "Bebas Neue", "Oswald", "Barlow Condensed", system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(`${visited}`, W / 2, 206);

  // ── "/ total outlets" ────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '500 16px "DM Sans", system-ui';
  ctx.fillText(`/ ${total} Anytime Fitness outlets`, W / 2, 232);

  // ── "in Singapore" ───────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '400 13px "DM Sans", system-ui';
  ctx.fillText('in Singapore', W / 2, 254);

  // ── Progress bar ─────────────────────────────────────────────────────────
  const barX = 40, barY = 272, barW = W - 80, barH = 10, barR = 5;
  // Track
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  roundRect(ctx, barX, barY, barW, barH, barR);
  ctx.fill();
  // Fill
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, '#7C42ED');
  fillGrad.addColorStop(1, '#A78BFA');
  ctx.fillStyle = fillGrad;
  roundRect(ctx, barX, barY, barW * (percentage / 100), barH, barR);
  ctx.fill();

  // ── Percentage badge ─────────────────────────────────────────────────────
  ctx.fillStyle = '#A78BFA';
  ctx.font = `700 18px "Bebas Neue", "Oswald", system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(`${percentage}%`, W / 2, 310);

  // ── Divider ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 326);
  ctx.lineTo(W - 40, 326);
  ctx.stroke();

  // ── Region breakdown ─────────────────────────────────────────────────────
  ctx.font = '600 11px "DM Sans", system-ui';
  ctx.textAlign = 'left';
  const topRegions = regionStats.slice(0, 5);
  const colW = (W - 80) / Math.min(topRegions.length, 5);

  topRegions.forEach(({ region, visited: rv, total: rt, pct }, i) => {
    const x = 40 + i * colW;
    const y = 344;

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '600 10px "DM Sans", system-ui';
    ctx.fillText(region.split(' ')[0], x, y);

    ctx.fillStyle = pct === 100 ? '#F5A623' : '#A78BFA';
    ctx.font = '700 11px "DM Sans", system-ui';
    ctx.fillText(`${rv}/${rt}`, x, y + 14);

    // mini bar
    const mBarW = colW - 10;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, x, y + 18, mBarW, 4, 2);
    ctx.fill();
    ctx.fillStyle = pct === 100 ? '#F5A623' : '#7C42ED';
    roundRect(ctx, x, y + 18, mBarW * (pct / 100), 4, 2);
    ctx.fill();
  });

  // ── Footer CTA ────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '400 12px "DM Sans", system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Track your journey → af-tracker.sg', W / 2, H - 26);

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
}

// Helper to draw rounded rects
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  if (w <= 0) return;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
