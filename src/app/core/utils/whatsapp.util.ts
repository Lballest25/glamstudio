// Port of lib/core/utils/whatsapp_url_builder.dart — builds wa.me deep
// links with prefilled Spanish messages, exactly matching the Flutter
// app's copy so clients see consistent messaging regardless of which app
// the owner sent it from.
export type AlertType = 'to_10' | 'to_20' | 'to_gift' | 'unlocked_10' | 'unlocked_20' | 'unlocked_gift';

const BASE_URL = 'https://wa.me/';

function firstName(fullName: string): string {
  return fullName.trim().split(' ')[0] ?? fullName;
}

function formatPhone(phone: string, countryCode = '57'): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `${countryCode}${digits}` : digits;
}

function buildUri(phone: string, message: string, countryCode = '57'): string {
  const formatted = formatPhone(phone, countryCode);
  return `${BASE_URL}${formatted}?text=${encodeURIComponent(message)}`;
}

export function buildChatUri(phone: string, countryCode = '57'): string {
  return `${BASE_URL}${formatPhone(phone, countryCode)}`;
}

// No recipient: WhatsApp lets the sender pick the contact/group.
export function buildShareUri(message: string): string {
  return `${BASE_URL}?text=${encodeURIComponent(message)}`;
}

export function buildLoyaltyAlertUri(
  clientPhone: string,
  clientName: string,
  nextBenefitType: 'discount' | 'gift',
  nextBenefitValue?: number,
  countryCode = '57'
): string {
  const name = firstName(clientName);
  const benefitText =
    nextBenefitType === 'discount' ? `${(nextBenefitValue ?? 0).toFixed(0)}% de descuento` : 'un regalo especial 🎁';

  const message = `¡Hola ${name}! 💄✨

Te escribo desde GlamStudio para darte una gran noticia:

📍 *¡Solo te falta 1 sesión para obtener ${benefitText}!*

Ya llevas un camino increíble con nosotras 💕

¡Te esperamos pronto! Responde este mensaje para agendar tu cita.

Con cariño,
*GlamStudio* 💅`;

  return buildUri(clientPhone, message, countryCode);
}

export function buildDiscount10UnlockedUri(clientPhone: string, clientName: string, countryCode = '57'): string {
  const name = firstName(clientName);
  const message = `¡Felicidades ${name}! 🎉💄

¡Has desbloqueado tu *10% de descuento* en GlamStudio!

Este descuento se aplicará automáticamente en tu próxima visita como agradecimiento por tu lealtad 💕

Eres una clienta increíble y nos alegra tenerte con nosotras.

¡Hasta pronto! 💅✨
*GlamStudio*`;
  return buildUri(clientPhone, message, countryCode);
}

export function buildDiscount20UnlockedUri(clientPhone: string, clientName: string, countryCode = '57'): string {
  const name = firstName(clientName);
  const message = `¡Increíble ${name}! ✨💄

¡Tu lealtad tiene su recompensa: ahora tienes *20% de descuento* en tu próxima visita!

Eres de nuestras clientas más especiales y lo sabes 🌟

¡Te esperamos pronto con los brazos abiertos!

Con mucho cariño,
*GlamStudio* 💅`;
  return buildUri(clientPhone, message, countryCode);
}

export function buildGiftUnlockedUri(clientPhone: string, clientName: string, countryCode = '57'): string {
  const name = firstName(clientName);
  const message = `¡${name}, tienes un REGALO esperándote! 🎁✨💄

¡Has completado tu ciclo de fidelización en GlamStudio!

🎁 *Tu regalo especial está listo para tu próxima visita*

Es nuestra forma de decirte GRACIAS por confiar en nosotras y ser una clienta tan especial 💕

Contáctanos para coordinar tu regalo. ¡No podemos esperar para verte!

Con mucho cariño,
*GlamStudio* 💅`;
  return buildUri(clientPhone, message, countryCode);
}

export function build1SessionTo10PctUri(clientPhone: string, clientName: string, countryCode = '57'): string {
  const name = firstName(clientName);
  const message = `¡Hola ${name}! 💄✨

¡Solo te falta *1 sesión* para obtener tu *10% de descuento* en GlamStudio!

Tu próxima visita será muy especial 💕

¡Te esperamos pronto! Responde este mensaje para agendar.

*GlamStudio* 💅`;
  return buildUri(clientPhone, message, countryCode);
}

export function build1SessionTo20PctUri(clientPhone: string, clientName: string, countryCode = '57'): string {
  const name = firstName(clientName);
  const message = `¡Hola ${name}! 💄

¡Estás a solo *1 sesión* de subir a *20% de descuento* en GlamStudio!

Ya llevas un camino increíble con nosotras ✨

¡Agenda tu cita pronto para aprovecharlo!

*GlamStudio* 💅`;
  return buildUri(clientPhone, message, countryCode);
}

export function build1SessionToGiftUri(clientPhone: string, clientName: string, countryCode = '57'): string {
  const name = firstName(clientName);
  const message = `¡${name}, casi llegamos! 🎁💄

¡Te falta *1 sola sesión* para recibir tu *regalo especial* en GlamStudio!

¡Va a ser una visita que no olvidarás! 💕

¡Agenda pronto! Responde este mensaje.

Con cariño,
*GlamStudio* 💅`;
  return buildUri(clientPhone, message, countryCode);
}

export function buildBirthdayUri(clientPhone: string, clientName: string, countryCode = '57'): string {
  const name = firstName(clientName);
  const message = `¡Feliz cumpleaños ${name}! 🎂💄✨

Desde GlamStudio queremos desearte un día increíble lleno de amor y felicidad 💕

Eres una clienta muy especial para nosotras y nos alegra tenerte.

¡Espero que hoy te consientas mucho! 🌟

Con cariño,
*GlamStudio* 💅`;
  return buildUri(clientPhone, message, countryCode);
}

export function buildAppointmentReminderUri(
  clientPhone: string,
  clientName: string,
  scheduledAt: Date,
  countryCode = '57'
): string {
  const name = firstName(clientName);
  const dateStr = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(scheduledAt);

  const message = `¡Hola ${name}! 💄

Te recordamos que tienes una cita en *GlamStudio* el:

📅 *${dateStr}*

Si necesitas reprogramar o tienes alguna duda, responde este mensaje y con gusto te ayudamos.

¡Te esperamos! ✨
*GlamStudio* 💅`;
  return buildUri(clientPhone, message, countryCode);
}

export function buildAlertUri(
  clientPhone: string,
  clientName: string,
  alertType: AlertType,
  benefitValue?: number,
  countryCode = '57'
): string {
  switch (alertType) {
    case 'to_10':
      return build1SessionTo10PctUri(clientPhone, clientName, countryCode);
    case 'to_20':
      return build1SessionTo20PctUri(clientPhone, clientName, countryCode);
    case 'to_gift':
      return build1SessionToGiftUri(clientPhone, clientName, countryCode);
    case 'unlocked_10':
      return buildDiscount10UnlockedUri(clientPhone, clientName, countryCode);
    case 'unlocked_20':
      return buildDiscount20UnlockedUri(clientPhone, clientName, countryCode);
    case 'unlocked_gift':
      return buildGiftUnlockedUri(clientPhone, clientName, countryCode);
    default:
      return buildLoyaltyAlertUri(clientPhone, clientName, 'discount', benefitValue, countryCode);
  }
}
