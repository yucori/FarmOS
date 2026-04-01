import type { SensorReading, IrrigationEvent, SensorAlert } from '@/types';

function generateSensorReadings(): SensorReading[] {
  const readings: SensorReading[] = [];
  const baseDate = new Date('2026-03-01T00:00:00');

  for (let hour = 0; hour < 720; hour++) {
    const date = new Date(baseDate.getTime() + hour * 3600000);
    const day = Math.floor(hour / 24) + 1;
    const hourOfDay = hour % 24;

    // Base values with diurnal cycle
    let soilMoisture = 68 + Math.sin(hour * 0.02) * 5;
    let temperature = 12 + 8 * Math.sin((hourOfDay - 6) * Math.PI / 12);
    let humidity = 65 + 10 * Math.cos((hourOfDay - 6) * Math.PI / 12);
    const lightIntensity = hourOfDay >= 6 && hourOfDay <= 18
      ? 400 * Math.sin((hourOfDay - 6) * Math.PI / 12)
      : 0;

    // Day 2-3: moisture drops triggering irrigation
    if (day === 2 && hourOfDay >= 12) {
      soilMoisture = 65 - (hourOfDay - 12) * 2;
    }
    if (day === 3 && hourOfDay < 14) {
      soilMoisture = 55 - (14 - hourOfDay) * 0.5;
    }
    // Day 3 afternoon: irrigation recovery
    if (day === 3 && hourOfDay >= 14) {
      soilMoisture = 55 + (hourOfDay - 14) * 3;
    }
    if (day >= 4 && day <= 9) {
      soilMoisture = 70 + Math.sin(hour * 0.03) * 4;
    }

    // Day 10-13: rainy period
    if (day >= 10 && day <= 13) {
      humidity = 85 + Math.random() * 10;
      temperature = 8 + 4 * Math.sin((hourOfDay - 6) * Math.PI / 12);
      soilMoisture = 78 + Math.random() * 8;
    }

    // Day 14-30: normal with slight variations
    if (day >= 14) {
      soilMoisture = 66 + Math.sin(hour * 0.025) * 6 + (day > 20 ? 3 : 0);
      temperature = 14 + 9 * Math.sin((hourOfDay - 6) * Math.PI / 12);
    }

    readings.push({
      timestamp: date.toISOString(),
      soilMoisture: Math.round(Math.max(40, Math.min(95, soilMoisture)) * 10) / 10,
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(Math.max(30, Math.min(98, humidity)) * 10) / 10,
      lightIntensity: Math.round(Math.max(0, lightIntensity)),
    });
  }

  return readings;
}

export const SENSOR_READINGS: SensorReading[] = generateSensorReadings();

export const IRRIGATION_EVENTS: IrrigationEvent[] = [
  {
    id: 'irr-001',
    triggeredAt: '2026-03-03T14:30:00',
    reason: '토양 습도 55% 이하 (임계값: 55%)',
    valveAction: '열림',
    duration: 30,
    autoTriggered: true,
  },
  {
    id: 'irr-002',
    triggeredAt: '2026-03-03T15:00:00',
    reason: '관수 완료 — 토양 습도 72% 도달',
    valveAction: '닫힘',
    duration: 0,
    autoTriggered: true,
  },
  {
    id: 'irr-003',
    triggeredAt: '2026-03-18T06:00:00',
    reason: '예약 관수 (주간 스케줄)',
    valveAction: '열림',
    duration: 20,
    autoTriggered: true,
  },
  {
    id: 'irr-004',
    triggeredAt: '2026-03-18T06:20:00',
    reason: '예약 관수 완료',
    valveAction: '닫힘',
    duration: 0,
    autoTriggered: true,
  },
];

export const SENSOR_ALERTS: SensorAlert[] = [
  {
    id: 'alert-001',
    type: 'moisture',
    severity: '경고',
    message: '토양 습도가 55%로 임계값 이하입니다',
    timestamp: '2026-03-03T14:25:00',
    resolved: true,
  },
  {
    id: 'alert-002',
    type: 'moisture',
    severity: '정보',
    message: '자동 관수 완료. 습도 72%로 회복',
    timestamp: '2026-03-03T15:00:00',
    resolved: true,
  },
  {
    id: 'alert-003',
    type: 'humidity',
    severity: '주의',
    message: '대기 습도 92%. 병해 발생 위험 증가',
    timestamp: '2026-03-11T08:00:00',
    resolved: true,
  },
  {
    id: 'alert-004',
    type: 'temperature',
    severity: '정보',
    message: '야간 기온 4°C. 서리 주의',
    timestamp: '2026-03-22T04:00:00',
    resolved: false,
  },
];
