import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MdTrendingUp, MdCalendarToday, MdShowChart } from 'react-icons/md';
import { GROWTH_DATA, YIELD_PREDICTION, MARKET_PRICES, SHIP_TIMING, HISTORICAL_YEARS } from '@/mocks/harvest';

export default function HarvestPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="space-y-6">
      {/* Yield Prediction Card */}
      <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">예상 수확량</p>
            <p className="text-3xl sm:text-4xl font-bold text-gray-900 mt-1">
              {YIELD_PREDICTION.predictedYield.toLocaleString()}<span className="text-lg sm:text-xl text-gray-400">{YIELD_PREDICTION.unit}</span>
            </p>
            <p className="text-sm text-success mt-2 font-medium">{YIELD_PREDICTION.comparisonText}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">신뢰도</p>
            <p className="text-2xl font-bold text-primary">{Math.round(YIELD_PREDICTION.confidence * 100)}%</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-600 mb-2">예측 근거</p>
          <div className="space-y-1">
            {YIELD_PREDICTION.factors.map((f, i) => (
              <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <MdTrendingUp className="text-success mt-0.5 flex-shrink-0" /> {f}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="section-title mb-4">과실 크기 추이 (mm)</h3>
          {mounted && <div className="h-[200px] sm:h-[250px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={GROWTH_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => `${new Date(d).getDate()}일`} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={d => `${new Date(d).getMonth() + 1}월 ${new Date(d).getDate()}일`} />
                <Line type="monotone" dataKey="fruitSize" stroke="#16A34A" strokeWidth={2} dot={false} name="크기 (mm)" />
              </LineChart>
            </ResponsiveContainer>
          </div>}
        </div>

        <div className="card">
          <h3 className="section-title mb-4">당도 추이 (Brix)</h3>
          {mounted && <div className="h-[200px] sm:h-[250px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={GROWTH_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => `${new Date(d).getDate()}일`} />
                <YAxis domain={[10, 16]} tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={d => `${new Date(d).getMonth() + 1}월 ${new Date(d).getDate()}일`} />
                <Line type="monotone" dataKey="sugarContent" stroke="#F59E0B" strokeWidth={2} dot={false} name="당도 (Brix)" />
              </LineChart>
            </ResponsiveContainer>
          </div>}
        </div>
      </div>

      {/* Market Prices */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <MdShowChart className="text-xl text-primary" />
          <h3 className="section-title">도매시장 가격 추이 (원/kg)</h3>
        </div>
        {mounted && <div className="h-[200px] sm:h-[280px] overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MARKET_PRICES}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => `${new Date(d).getDate()}일`} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
              <Tooltip
                labelFormatter={d => `${new Date(d).getMonth() + 1}월 ${new Date(d).getDate()}일`}
                formatter={(v) => `${Number(v).toLocaleString()}원`}
              />
              <Bar dataKey="price" fill="#3B82F6" radius={[2, 2, 0, 0]} name="가격" />
            </BarChart>
          </ResponsiveContainer>
        </div>}
      </div>

      {/* Ship Timing */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <MdCalendarToday className="text-xl text-primary" />
          <h3 className="section-title">최적 출하 시기</h3>
        </div>
        <div className="p-4 bg-primary/5 rounded-xl">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-gray-500">추천 출하일</p>
              <p className="text-xl sm:text-2xl font-bold text-primary">{SHIP_TIMING.optimalDate}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">예상 가격</p>
              <p className="text-xl sm:text-2xl font-bold text-success">{SHIP_TIMING.expectedPrice.toLocaleString()}원/kg</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">{SHIP_TIMING.reasoning}</p>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-600 mb-2">대안 출하일</p>
          <div className="grid grid-cols-3 gap-3">
            {SHIP_TIMING.alternativeDates.map(alt => (
              <div key={alt.date} className="p-3 bg-gray-50 rounded-xl text-center">
                <p className="text-sm font-medium text-gray-700">{alt.date}</p>
                <p className="text-sm text-gray-500 mt-1">{alt.price.toLocaleString()}원/kg</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Comparison */}
      <div className="card">
        <h3 className="section-title mb-4">연도별 비교</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">연도</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">수확량 (kg)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">평균 가격 (원/kg)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">매출 (원)</th>
              </tr>
            </thead>
            <tbody>
              {HISTORICAL_YEARS.map(y => (
                <tr key={y.year} className={`border-b border-gray-50 ${y.year.includes('예측') ? 'bg-primary/5 font-semibold' : ''}`}>
                  <td className="py-3 px-4">{y.year}</td>
                  <td className="text-right py-3 px-4">{y.yield.toLocaleString()}</td>
                  <td className="text-right py-3 px-4">{y.avgPrice.toLocaleString()}</td>
                  <td className="text-right py-3 px-4">{y.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
