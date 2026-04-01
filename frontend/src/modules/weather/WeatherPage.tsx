import { MdWarning, MdCheckCircle, MdBlock } from 'react-icons/md';
import { SEVEN_DAY_FORECAST, WEATHER_ALERTS, RECOMMENDED_TASKS } from '@/mocks/weather';

export default function WeatherPage() {
  return (
    <div className="space-y-6">
      {/* Weather Alerts */}
      {WEATHER_ALERTS.map(alert => (
        <div key={alert.id} className="card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <MdWarning className="text-3xl text-danger flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-danger">{alert.severity}</span>
                <span className="font-bold text-danger">{alert.type}</span>
              </div>
              <p className="text-gray-800 mt-2">{alert.message}</p>
              <p className="text-sm text-gray-500 mt-1">
                기간: {alert.startDate} ~ {alert.endDate}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* 7-Day Forecast */}
      <div className="card !p-4 sm:!p-6">
        <h3 className="section-title mb-4">7일 예보</h3>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-2 sm:gap-3" style={{ minWidth: 'max-content' }}>
            {SEVEN_DAY_FORECAST.map(day => {
              const isRainy = day.condition === '비' || day.condition === '소나기';
              const isSunny = day.condition === '맑음';
              return (
                <div
                  key={day.date}
                  className={`text-center p-3 rounded-2xl border-2 transition-all w-[88px] sm:w-auto sm:flex-1 ${
                    isRainy
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : isSunny
                      ? 'bg-amber-50/50 border-amber-100'
                      : 'bg-gray-50 border-transparent'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-600">
                    {new Date(day.date).toLocaleDateString('ko-KR', { weekday: 'short' })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(day.date).getDate()}일
                  </p>
                  <p className="text-3xl sm:text-4xl my-2 sm:my-3">{day.icon}</p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">{day.condition}</p>
                  <p className="text-sm sm:text-base mt-1.5 font-medium">
                    <span className="text-red-500">{day.tempHigh}°</span>
                    <span className="text-gray-300 mx-0.5">/</span>
                    <span className="text-blue-500">{day.tempLow}°</span>
                  </p>
                  {day.precipitation > 0 && (
                    <p className={`text-xs sm:text-sm mt-1 font-semibold ${day.precipitation > 20 ? 'text-blue-600' : 'text-blue-400'}`}>
                      💧 {day.precipitation}mm
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Calendar */}
      <div className="card">
        <h3 className="section-title mb-4">AI 작업 추천 캘린더</h3>
        <div className="space-y-3">
          {RECOMMENDED_TASKS.map(task => (
            <div
              key={task.id}
              className={`p-4 rounded-xl border ${
                task.blocked
                  ? 'border-red-200 bg-red-50'
                  : task.recommended
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  {task.blocked ? (
                    <MdBlock className="text-xl text-danger mt-0.5" />
                  ) : task.recommended ? (
                    <MdCheckCircle className="text-xl text-success mt-0.5" />
                  ) : (
                    <MdWarning className="text-xl text-warning mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      <span className={`badge text-xs ${
                        task.type === '방제' ? 'badge-warning' :
                        task.type === '관찰' ? 'badge-info' :
                        task.type === '전정' ? 'badge-success' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {task.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    {task.blockReason && (
                      <p className="text-sm text-danger mt-1 font-medium">
                        ⚠ {task.blockReason}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-400 whitespace-nowrap">
                  {new Date(task.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
