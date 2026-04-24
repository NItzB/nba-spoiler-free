export interface Timezone {
  flag: string
  city: string
  name: string // IANA timezone identifier
}

export const TIMEZONES: Timezone[] = [
  // North America
  { flag: '🇺🇸', city: 'New York', name: 'America/New_York' },
  { flag: '🇺🇸', city: 'Chicago', name: 'America/Chicago' },
  { flag: '🇺🇸', city: 'Denver', name: 'America/Denver' },
  { flag: '🇺🇸', city: 'Los Angeles', name: 'America/Los_Angeles' },
  { flag: '🇨🇦', city: 'Toronto', name: 'America/Toronto' },
  { flag: '🇲🇽', city: 'Mexico City', name: 'America/Mexico_City' },

  // South America
  { flag: '🇧🇷', city: 'São Paulo', name: 'America/Sao_Paulo' },
  { flag: '🇦🇷', city: 'Buenos Aires', name: 'America/Argentina/Buenos_Aires' },

  // Europe
  { flag: '🇬🇧', city: 'London', name: 'Europe/London' },
  { flag: '🇬🇧', city: 'Dublin', name: 'Europe/Dublin' },
  { flag: '🇫🇷', city: 'Paris', name: 'Europe/Paris' },
  { flag: '🇩🇪', city: 'Berlin', name: 'Europe/Berlin' },
  { flag: '🇮🇹', city: 'Rome', name: 'Europe/Rome' },
  { flag: '🇪🇸', city: 'Madrid', name: 'Europe/Madrid' },
  { flag: '🇷🇺', city: 'Moscow', name: 'Europe/Moscow' },

  // Middle East & Africa
  { flag: '🇮🇱', city: 'Jerusalem', name: 'Asia/Jerusalem' },
  { flag: '🇸🇦', city: 'Riyadh', name: 'Asia/Riyadh' },
  { flag: '🇦🇪', city: 'Dubai', name: 'Asia/Dubai' },
  { flag: '🇪🇬', city: 'Cairo', name: 'Africa/Cairo' },
  { flag: '🇿🇦', city: 'Johannesburg', name: 'Africa/Johannesburg' },

  // Asia
  { flag: '🇮🇳', city: 'India', name: 'Asia/Kolkata' },
  { flag: '🇧🇦', city: 'Bangkok', name: 'Asia/Bangkok' },
  { flag: '🇸🇬', city: 'Singapore', name: 'Asia/Singapore' },
  { flag: '🇭🇰', city: 'Hong Kong', name: 'Asia/Hong_Kong' },
  { flag: '🇨🇳', city: 'Shanghai', name: 'Asia/Shanghai' },
  { flag: '🇯🇵', city: 'Tokyo', name: 'Asia/Tokyo' },
  { flag: '🇰🇷', city: 'Seoul', name: 'Asia/Seoul' },

  // Oceania
  { flag: '🇦🇺', city: 'Sydney', name: 'Australia/Sydney' },
  { flag: '🇦🇺', city: 'Melbourne', name: 'Australia/Melbourne' },
  { flag: '🇳🇿', city: 'Auckland', name: 'Pacific/Auckland' },
]

// Get user's system timezone, or fall back to Jerusalem
export function getSystemTimezone(): string {
  try {
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    // Try to find exact match
    const exactMatch = TIMEZONES.find(tz => tz.name === systemTz)
    if (exactMatch) return systemTz

    // Try to find close match by region (e.g., if system is "America/New_York", match to America/New_York)
    // For now, just return the system timezone - JavaScript will handle it
    return systemTz
  } catch {
    return 'Asia/Jerusalem' // Default fallback
  }
}

// Format timezone for display
export function formatTimezoneLabel(timezone: string): string {
  const tz = TIMEZONES.find(t => t.name === timezone)
  if (tz) {
    return `${tz.flag} ${tz.city}`
  }
  // Fallback for system timezones not in our list
  return timezone.replace(/_/g, ' ')
}
