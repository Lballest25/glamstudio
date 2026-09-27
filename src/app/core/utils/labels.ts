import { AppointmentStatus, ExpenseCategory, ServiceCategory } from '../models/database.types';

export interface Meta {
  label: string;
  icon: string;
}

export const CATEGORY_ORDER: ServiceCategory[] = ['pestañas', 'cejas', 'depilacion', 'tratamiento', 'otro'];

const CATEGORY_META: Record<string, Meta> = {
  pestañas: { label: 'Pestañas', icon: 'eye' },
  cejas: { label: 'Cejas', icon: 'brush' },
  depilacion: { label: 'Depilación', icon: 'feather' },
  tratamiento: { label: 'Tratamientos', icon: 'droplet' },
  otro: { label: 'Otros', icon: 'sparkles' },
};

export function categoryMeta(category: string): Meta {
  return CATEGORY_META[category] ?? { label: category, icon: 'sparkles' };
}

const STATUS_META: Record<AppointmentStatus, { label: string; badge: string }> = {
  scheduled: { label: 'Agendada', badge: 'badge-primary' },
  in_progress: { label: 'En curso', badge: 'badge-info' },
  completed: { label: 'Completada', badge: 'badge-success' },
  cancelled: { label: 'Cancelada', badge: '' },
  no_show: { label: 'No asistió', badge: 'badge-danger' },
};

export function statusMeta(status: string): { label: string; badge: string } {
  return STATUS_META[status as AppointmentStatus] ?? { label: status, badge: '' };
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['insumos', 'renta', 'servicios', 'marketing', 'otro'];

const EXPENSE_META: Record<ExpenseCategory, Meta> = {
  insumos: { label: 'Insumos', icon: 'package' },
  renta: { label: 'Arriendo', icon: 'building' },
  servicios: { label: 'Servicios públicos', icon: 'zap' },
  marketing: { label: 'Marketing', icon: 'megaphone' },
  otro: { label: 'Otro', icon: 'circle-dot' },
};

export function expenseMeta(category: string): Meta {
  return EXPENSE_META[category as ExpenseCategory] ?? { label: category, icon: 'circle-dot' };
}

export type PaymentChoice = 'cash' | 'transfer' | 'card';

export const PAYMENT_OPTIONS: { value: PaymentChoice; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: 'banknote' },
  { value: 'transfer', label: 'Transferencia', icon: 'transfer' },
  { value: 'card', label: 'Tarjeta', icon: 'credit-card' },
];
