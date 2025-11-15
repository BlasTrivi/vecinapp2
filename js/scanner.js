// scanner.js - escaneo de QR para cupones
import { redeemCouponCode } from './promotions.js';
import { renderApp } from './auth.js';

let scanning = false;
let videoEl; let canvasEl; let ctx; let rafId; let lastResult = null;

function stopScanner() {
  scanning = false;
  if (rafId) cancelAnimationFrame(rafId);
  if (videoEl && videoEl.srcObject) {
    const tracks = videoEl.srcObject.getTracks();
    tracks.forEach(t=>t.stop());
  }
  const modal = document.getElementById('scanner-modal');
  if (modal) modal.remove();
}

function tick() {
  if (!scanning) return;
  if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    ctx.drawImage(videoEl,0,0,canvasEl.width,canvasEl.height);
    try {
      const imageData = ctx.getImageData(0,0,canvasEl.width,canvasEl.height);
      if (window.jsQR) {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data && code.data !== lastResult) {
          lastResult = code.data;
          handleCode(code.data);
        }
      }
    } catch(e) { /* ignore */ }
  }
  rafId = requestAnimationFrame(tick);
}

function handleCode(data) {
  // Intentar redimir cupón
  const res = redeemCouponCode(data.trim());
  if (res.ok) {
    alert('Cupón canjeado: ' + data);
    stopScanner();
    renderApp();
  } else {
    // Mostrar sólo mensaje, continuar escaneo
    console.log(res.message);
  }
}

export function openScannerModal() {
  if (scanning) return;
  const modal = document.createElement('div');
  modal.id = 'scanner-modal';
  modal.style.position='fixed';
  modal.style.inset='0';
  modal.style.background='rgba(0,0,0,0.7)';
  modal.style.display='flex';
  modal.style.flexDirection='column';
  modal.style.alignItems='center';
  modal.style.justifyContent='center';
  modal.style.zIndex='1000';

  const box = document.createElement('div');
  box.style.background='#fff';
  box.style.padding='1rem';
  box.style.borderRadius='0.75rem';
  box.style.width='min(400px,90%)';
  box.innerHTML = `<h3>Escanear cupón</h3>
    <p style="font-size:0.75rem;color:#555">Apunta la cámara al QR del cliente. Se intentará redimir automáticamente.</p>
    <div style="position:relative;width:100%;padding-top:56%;background:#000;border-radius:0.5rem;overflow:hidden;">
      <video id="scanner-video" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover"></video>
      <div style="position:absolute;inset:0;border:2px solid rgba(255,255,255,0.6);pointer-events:none"></div>
    </div>
    <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
      <input id="manual-code" placeholder="Código manual" style="flex:1;padding:0.4rem;border:1px solid #ccc;border-radius:0.5rem;font-size:0.8rem" />
      <button class="btn" id="btn-manual">Canjear</button>
    </div>
    <button class="btn danger" id="btn-close" style="margin-top:0.75rem;">Cerrar</button>`;
  modal.appendChild(box);
  document.body.appendChild(modal);

  videoEl = box.querySelector('#scanner-video');
  canvasEl = document.createElement('canvas');
  ctx = canvasEl.getContext('2d');

  box.querySelector('#btn-close').addEventListener('click', () => stopScanner());
  box.querySelector('#btn-manual').addEventListener('click', () => {
    const code = box.querySelector('#manual-code').value.trim();
    if (!code) return;
    const res = redeemCouponCode(code);
    if (res.ok) { alert('Cupón canjeado manualmente'); stopScanner(); renderApp(); } else { alert(res.message); }
  });

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => {
    videoEl.srcObject = stream;
    videoEl.setAttribute('playsinline','true');
    videoEl.play();
    scanning = true;
    tick();
  }).catch(err => {
    alert('No se pudo acceder a la cámara: ' + err.message);
  });
}
