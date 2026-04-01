import type { GrowthData, YieldPrediction, MarketPrice, ShipTiming } from '@/types';

export const GROWTH_DATA: GrowthData[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-03-${String(i + 1).padStart(2, '0')}`,
  fruitSize: 45 + i * 1.2 + Math.sin(i * 0.5) * 2,
  colorIndex: Math.min(10, 2 + i * 0.25 + Math.random() * 0.5),
  sugarContent: 10.5 + i * 0.12 + Math.sin(i * 0.3) * 0.3,
}));

export const YIELD_PREDICTION: YieldPrediction = {
  predictedYield: 12500,
  unit: 'kg',
  confidence: 0.82,
  comparisonText: '작년 대비 +8% (11,574kg → 12,500kg 예상)',
  factors: [
    '3월 기온 평년 대비 +1.5°C → 생육 촉진',
    '토양 수분 관리 양호 (자동 관수 효과)',
    '점무늬낙엽병 조기 방제 성공',
    '폭우 피해 최소화 (사전 배수 정비)',
  ],
};

export const MARKET_PRICES: MarketPrice[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-03-${String(i + 1).padStart(2, '0')}`,
  price: 3200 + Math.sin(i * 0.3) * 400 + (i > 20 ? 300 : 0),
  volume: 12000 + Math.sin(i * 0.2) * 3000 + Math.random() * 1000,
}));

export const SHIP_TIMING: ShipTiming = {
  optimalDate: '2026-10-15',
  expectedPrice: 4200,
  reasoning: '추석 전후 수요 증가 예상. 올해 기온 상승으로 숙기 1주 빨라질 전망. 10월 중순 출하 시 평균 대비 15% 높은 가격 기대.',
  alternativeDates: [
    { date: '2026-10-08', price: 3900 },
    { date: '2026-10-22', price: 3800 },
    { date: '2026-11-01', price: 3500 },
  ],
};

export const HISTORICAL_YEARS = [
  { year: '2023', yield: 10800, avgPrice: 3100, revenue: 33480000 },
  { year: '2024', yield: 11200, avgPrice: 3350, revenue: 37520000 },
  { year: '2025', yield: 11574, avgPrice: 3500, revenue: 40509000 },
  { year: '2026 (예측)', yield: 12500, avgPrice: 3800, revenue: 47500000 },
];
