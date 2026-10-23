export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Genera intervalos de horarios posibles entre las 09:00 y las 19:00
export function generateDayTimeSlots(dateStr: string, intervalMinutes = 30): string[] {
  const slots: string[] = [];
  const startHour = 9; // 9:00 AM
  const endHour = 19;  // 7:00 PM

  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      const hStr = hour.toString().padStart(2, '0');
      const mStr = min.toString().padStart(2, '0');
      slots.push(`${dateStr}T${hStr}:${mStr}:00`);
    }
  }

  return slots;
}
