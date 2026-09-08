import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export const formatDatePt = (dateStr) => {
  try {
    return format(parseISO(dateStr), "EEE, dd 'de' MMM", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

export const getWeekMarker = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)));
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  return `${thursday.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};