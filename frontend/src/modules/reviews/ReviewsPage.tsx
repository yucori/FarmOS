import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MdTrendingUp, MdStar } from 'react-icons/md';
import { REVIEWS, SENTIMENT_SUMMARY, KEYWORD_DATA, WEEKLY_TRENDS, AI_STRATEGIES } from '@/mocks/reviews';

const SENTIMENT_COLORS = { positive: '#16A34A', negative: '#DC2626', neutral: '#9CA3AF' };

export default function ReviewsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const filteredReviews = selectedPlatform === 'all'
    ? REVIEWS
    : REVIEWS.filter(r => r.platform === selectedPlatform);

  const pieData = [
    { name: '긍정', value: SENTIMENT_SUMMARY.positive, color: SENTIMENT_COLORS.positive },
    { name: '부정', value: SENTIMENT_SUMMARY.negative, color: SENTIMENT_COLORS.negative },
    { name: '중립', value: SENTIMENT_SUMMARY.neutral, color: SENTIMENT_COLORS.neutral },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card !p-3 sm:!p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500">총 리뷰</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{SENTIMENT_SUMMARY.total}</p>
        </div>
        <div className="card !p-3 sm:!p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500">긍정률</p>
          <p className="text-2xl sm:text-3xl font-bold text-success">{Math.round(SENTIMENT_SUMMARY.positive / SENTIMENT_SUMMARY.total * 100)}%</p>
        </div>
        <div className="card !p-3 sm:!p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500">평균 평점</p>
          <p className="text-2xl sm:text-3xl font-bold text-amber-500">
            4.1 <MdStar className="inline text-amber-400" />
          </p>
        </div>
        <div className="card !p-3 sm:!p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500">AI 인사이트</p>
          <p className="text-2xl sm:text-3xl font-bold text-primary">{AI_STRATEGIES.length}건</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Pie Chart */}
        <div className="card">
          <h3 className="section-title mb-4">감성 분석</h3>
          {mounted && <div className="h-[260px] sm:h-[300px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="45%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}건`} />
                <Legend
                  formatter={(value, entry: any) => `${value} ${entry.payload.value}건`}
                  iconType="circle"
                  iconSize={10}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>}
        </div>

        {/* Weekly Trend */}
        <div className="card">
          <h3 className="section-title mb-4">주간 추이</h3>
          {mounted && <div className="h-[200px] sm:h-[250px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_TRENDS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="positive" fill="#16A34A" name="긍정" radius={[4, 4, 0, 0]} />
                <Bar dataKey="negative" fill="#DC2626" name="부정" radius={[4, 4, 0, 0]} />
                <Bar dataKey="neutral" fill="#9CA3AF" name="중립" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>}
        </div>
      </div>

      {/* Keyword Cloud */}
      <div className="card">
        <h3 className="section-title mb-4">키워드 분석</h3>
        <div className="flex flex-wrap gap-2">
          {KEYWORD_DATA.map(k => (
            <span
              key={k.word}
              className={`px-3 py-1.5 rounded-full font-medium ${
                k.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                k.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-700'
              }`}
              style={{ fontSize: `${Math.max(14, Math.min(22, 10 + k.count))}px` }}
            >
              {k.word} ({k.count})
            </span>
          ))}
        </div>
      </div>

      {/* AI Strategy Recommendations */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <MdTrendingUp className="text-xl text-primary" />
          <h3 className="section-title">AI 판매 전략 추천</h3>
        </div>
        <div className="space-y-3">
          {AI_STRATEGIES.map(s => (
            <div key={s.id} className="p-4 rounded-xl border border-gray-100 hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-gray-900">{s.title}</h4>
                <span className={`badge text-xs ${
                  s.priority === '높음' ? 'badge-danger' :
                  s.priority === '중간' ? 'badge-warning' : 'badge-info'
                }`}>
                  {s.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{s.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="card">
        <div className="mb-4">
          <h3 className="section-title mb-3">리뷰 목록</h3>
          <div className="flex gap-2 flex-wrap">
            {['all', '네이버스마트스토어', '쿠팡'].map(p => (
              <button
                key={p}
                onClick={() => setSelectedPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  selectedPlatform === p ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p === 'all' ? '전체' : p}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2 max-h-[320px] sm:max-h-[400px] overflow-y-auto">
          {filteredReviews.map(r => (
            <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
              <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                r.sentiment === 'positive' ? 'bg-success' :
                r.sentiment === 'negative' ? 'bg-danger' : 'bg-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{r.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{r.platform}</span>
                  <span className="text-xs text-amber-500">{'★'.repeat(r.rating)}</span>
                  <span className="text-xs text-gray-300">{r.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
