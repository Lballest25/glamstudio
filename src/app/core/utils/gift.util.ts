// Loyalty gift rule (stage 3): only ONE service of the appointment is free —
// one unit of the cheapest line — and everything else is charged normally.
// Ties go to the first line. Mirrors AppointmentWithDetails.cheapestService
// in the Flutter app so both apps charge the same amount.
export function pickGiftLine<T extends { price_at_time: number }>(lines: T[]): T | undefined {
  return lines.reduce<T | undefined>((best, line) => (!best || line.price_at_time < best.price_at_time ? line : best), undefined);
}
