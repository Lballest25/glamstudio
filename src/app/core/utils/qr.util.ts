// The QR library is imported on demand so it only loads when Ajustes needs it.
// It's CommonJS: the production bundle exposes its functions under `default`
// only, while the dev server exposes them directly — so accept both.
export async function qrDataUrl(text: string, size = 720): Promise<string> {
  const mod: any = await import('qrcode');
  const QR = mod.default ?? mod;
  return QR.toDataURL(text, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#3d2656', light: '#ffffff' },
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// A4-proportioned poster (1240x1754 ≈ 150 dpi) with the QR for the studio.
export async function buildPoster(url: string): Promise<string> {
  const W = 1240;
  const H = 1754;
  const [qr, logo] = await Promise.all([loadImage(await qrDataUrl(url, 760)), loadImage('/logo.png')]);
  await Promise.all([document.fonts.load('600 110px Fraunces'), document.fonts.load('700 40px "Plus Jakarta Sans"')]);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#faf7fc';
  ctx.fillRect(0, 0, W, H);

  const band = ctx.createLinearGradient(0, 0, W, 620);
  band.addColorStop(0, '#3d2656');
  band.addColorStop(0.6, '#6a4793');
  band.addColorStop(1, '#9c7bb8');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, 620);

  ctx.beginPath();
  ctx.arc(W / 2, 190, 112, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, 190, 104, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logo, W / 2 - 104, 190 - 104, 208, 208);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 118px Fraunces, Georgia, serif';
  ctx.fillText('GlamStudio', W / 2, 440);
  ctx.font = '600 40px "Plus Jakarta Sans", sans-serif';
  ctx.globalAlpha = 0.88;
  ctx.fillText('Reserva tu cita en línea', W / 2, 520);
  ctx.globalAlpha = 1;

  const cardX = 190;
  const cardY = 560;
  const cardW = W - 380;
  const cardH = 900;
  ctx.shadowColor = 'rgba(36, 23, 51, 0.22)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 48);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.drawImage(qr, W / 2 - 380, cardY + 70, 760, 760);

  ctx.fillStyle = '#241733';
  ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Escanea con la cámara de tu celular', W / 2, 1560);
  ctx.fillStyle = '#62537a';
  ctx.font = '600 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(url.replace(/^https?:\/\//, ''), W / 2, 1618);

  ctx.fillStyle = '#7f7092';
  ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Pestañas · Cejas · Depilación · Tratamientos', W / 2, 1692);

  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function printImage(dataUrl: string) {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(
    `<!doctype html><title>Cartel GlamStudio</title><style>@page{margin:0}body{margin:0}img{width:100%;display:block}</style>` +
      `<img src="${dataUrl}" onload="setTimeout(function(){window.print()},150)">`
  );
  win.document.close();
  return true;
}
