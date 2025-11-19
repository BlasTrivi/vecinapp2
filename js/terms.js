const TERMS_CONTENT = `
  <p><strong>Última actualización:</strong> 19 de noviembre de 2025</p>
  <p>Bienvenido/a a VecinAPP ("la Aplicación", "la Plataforma"). Al utilizar nuestros servicios, aceptás estos Términos y Condiciones. Te recomendamos leerlos cuidadosamente.</p>

  <h3>1. Objeto del Servicio</h3>
  <p>VecinAPP es una plataforma digital que permite a comercios publicar promociones y a usuarios descubrirlas y canjearlas. VecinAPP no participa en las transacciones entre comercios y usuarios; la responsabilidad sobre el producto o servicio recae en el comercio.</p>

  <h3>2. Aceptación de los Términos</h3>
  <p>El uso de la plataforma implica la aceptación plena de estos Términos. Si no estás de acuerdo, debés abstenerte de usar VecinAPP.</p>

  <h3>3. Registro y Responsabilidad del Usuario</h3>
  <p>Podés navegar sin registrarte o crear una cuenta para gestionar tus datos. Al hacerlo, declarás que proporcionás información veraz, te responsabilizás por el uso que hacés de la plataforma y evitás cualquier acción que manipule o abuse del sistema de promociones. VecinAPP puede suspender cuentas que incumplan estas reglas.</p>

  <h3>4. Registro y Responsabilidad del Comercio</h3>
  <p>Los comercios garantizan que la información publicada es veraz, respetan las promociones ofrecidas y se responsabilizan por la calidad de sus productos o servicios. VecinAPP puede desactivar comercios en caso de detectar prácticas fraudulentas.</p>

  <h3>5. Promociones y Canje</h3>
  <p>Las promociones son administradas por los comercios. El canje implica presentar el beneficio, cumplir condiciones y respetar fechas vigentes. El comercio puede solicitar validaciones adicionales. VecinAPP no garantiza stock ni disponibilidad.</p>

  <h3>6. Contenido Publicado</h3>
  <p>Los comercios son responsables del contenido (textos, imágenes, precios, condiciones). VecinAPP puede solicitar modificaciones o eliminar material ofensivo, ilegal o engañoso.</p>

  <h3>7. Limitación de Responsabilidad</h3>
  <p>VecinAPP no se responsabiliza por incumplimientos, calidad de productos o daños derivados del uso de promociones. Actuamos como intermediario digital de difusión.</p>

  <h3>8. Funcionamiento de la Plataforma</h3>
  <p>Podemos realizar actualizaciones, mantenimiento o interrupciones temporales sin previo aviso. No garantizamos disponibilidad continua ni ausencia de errores.</p>

  <h3>9. Privacidad y Datos Personales</h3>
  <p>El uso de datos personales se rige por la Política de Privacidad. VecinAPP cumple con la Ley 25.326 de Protección de Datos Personales de Argentina.</p>

  <h3>10. Uso Adecuado</h3>
  <p>Está prohibido utilizar la plataforma con fines fraudulentos, crear comercios falsos, manipular promociones o intentar acceder a información privada. El uso indebido puede derivar en suspensión.</p>

  <h3>11. Propiedad Intelectual</h3>
  <p>La marca, el diseño y la interfaz de VecinAPP son propiedad de sus desarrolladores. No se permite su reproducción o uso comercial no autorizado.</p>

  <h3>12. Modificaciones de los Términos</h3>
  <p>Podemos modificar estos Términos en cualquier momento. El uso posterior implica la aceptación de los cambios.</p>

  <h3>13. Jurisdicción y Ley Aplicable</h3>
  <p>Estos Términos se rigen por las leyes de la República Argentina. Cualquier conflicto será resuelto en los tribunales ordinarios de la Ciudad de Rosario.</p>
`;

let modalEl;
let contentEl;
let initialized = false;

function openModal() {
  if (!modalEl) return;
  modalEl.classList.add('active');
  document.body.classList.add('modal-open');
  if (contentEl) {
    contentEl.scrollTop = 0;
    contentEl.focus({ preventScroll: true });
  }
}

function closeModal() {
  if (!modalEl) return;
  modalEl.classList.remove('active');
  document.body.classList.remove('modal-open');
}

export function initTermsModal() {
  if (initialized) return;
  modalEl = document.getElementById('terms-modal');
  if (!modalEl) return;
  contentEl = modalEl.querySelector('.terms-content');
  if (contentEl) {
    contentEl.innerHTML = TERMS_CONTENT;
  }

  modalEl.addEventListener('click', (event) => {
    if (event.target === modalEl) {
      closeModal();
    }
  });

  modalEl.querySelectorAll('[data-close-terms]').forEach((btn) => {
    btn.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalEl.classList.contains('active')) {
      closeModal();
    }
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-terms]');
    if (trigger) {
      event.preventDefault();
      openModal();
    }
  });

  initialized = true;
}
// End of File