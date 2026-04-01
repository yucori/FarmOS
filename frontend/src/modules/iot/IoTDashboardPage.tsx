import { useState, useEffect, useMemo, memo } from 'react';
import { MdWaterDrop, MdThermostat, MdOpacity, MdWbSunny, MdWarning, MdWifiOff } from 'react-icons/md';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useSensorData } from '@/hooks/useSensorData';

function SensorCard({ icon: Icon, label, value, unit, color, threshold, warning, disabled }: {
  icon: React.ElementType; label: string; value: number | null; unit: string;
  color: string; threshold?: number; warning?: boolean; disabled?: boolean;
}) {
  return (
    <div className={`card !p-4 sm:!p-6 ${
      disabled ? 'opacity-50 grayscale' :
      warning ? 'ring-2 ring-warning/60 bg-yellow-50/30' : ''
    }`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${disabled ? 'bg-gray-300' : color}`}>
          <Icon className="text-xl sm:text-2xl text-white" />
        </div>
        {!disabled && warning && (
          <span className="flex items-center gap-1 text-warning text-xs sm:text-sm font-semibold">
            <MdWarning className="text-base sm:text-lg" /> 주의
          </span>
        )}
        {disabled && (
          <span className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
            <MdWifiOff className="text-base" /> 비활성
          </span>
        )}
      </div>
      <p className={`text-sm sm:text-base mt-2 sm:mt-3 font-medium ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
      <p className={`text-2xl sm:text-4xl font-bold mt-1 tracking-tight ${disabled ? 'text-gray-300' : 'text-gray-900'}`}>
        {value !== null ? value.toFixed(1) : '--.-'}
        <span className="text-base sm:text-xl text-gray-400 ml-0.5">{unit}</span>
      </p>
      {threshold && !disabled && value !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${value < threshold ? 'bg-warning' : 'bg-success'}`}
              style={{ width: `${Math.min(100, (value / 100) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">기준 {threshold}{unit}</span>
        </div>
      )}
      {threshold && disabled && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden" />
          <span className="text-xs text-gray-300 whitespace-nowrap">기준 {threshold}{unit}</span>
        </div>
      )}
    </div>
  );
}

type ChartData = { time: string; soilMoisture: number; temperature: number; humidity: number }[];
const IoTCharts = memo(function IoTCharts({ chartData }: { chartData: ChartData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (chartData.length === 0) {
    return (
      <div className="card !p-8 text-center text-gray-400">
        <p className="text-lg">센서 데이터가 아직 없습니다</p>
        <p className="text-sm mt-1">ESP8266에서 데이터를 전송하면 차트가 표시됩니다</p>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h3 className="section-title mb-4">토양 습도 추이</h3>
        {mounted && (
          <div className="h-[200px] sm:h-[280px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <ReferenceLine y={55} stroke="#EAB308" strokeDasharray="5 5" label="임계값 55%" />
                <Line type="monotone" dataKey="soilMoisture" stroke="#3B82F6" strokeWidth={2} dot={false} name="토양 습도 (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="section-title mb-4">온도 · 습도 추이</h3>
        {mounted && (
          <div className="h-[200px] sm:h-[250px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="temperature" stroke="#EF4444" strokeWidth={2} dot={false} name="온도 (°C)" />
                <Line type="monotone" dataKey="humidity" stroke="#14B8A6" strokeWidth={2} dot={false} name="습도 (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
});

export default function IoTDashboardPage() {
  const { latest, history, alerts, irrigations, connected } = useSensorData();
  const hasData = !!latest;
  const inactive = !connected || !hasData;

  const chartData = useMemo(() =>
    history.map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      soilMoisture: r.soilMoisture,
      temperature: r.temperature,
      humidity: r.humidity,
    })),
  [history]);

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {connected && hasData ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            <span className="font-medium text-success">연결됨</span>
            <span>
              마지막 수신: {new Date(latest!.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </>
        ) : connected && !hasData ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-400"></span>
            </span>
            <span className="font-medium text-yellow-600">서버 연결됨 · 센서 데이터 대기 중</span>
          </>
        ) : (
          <>
            <MdWifiOff className="text-lg text-gray-400" />
            <span className="font-medium text-gray-400">백엔드 연결 안 됨</span>
            <span className="text-xs text-gray-300">http://localhost:8000</span>
          </>
        )}
      </div>

      {/* Sensor Cards — always visible, disabled when no data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SensorCard
          icon={MdWaterDrop} label="토양 습도"
          value={hasData ? latest!.soilMoisture : null} unit="%"
          color="bg-blue-500" threshold={55}
          warning={hasData && latest!.soilMoisture < 55}
          disabled={inactive}
        />
        <SensorCard
          icon={MdThermostat} label="온도"
          value={hasData ? latest!.temperature : null} unit="°C"
          color="bg-red-400"
          disabled={inactive}
        />
        <SensorCard
          icon={MdOpacity} label="대기 습도"
          value={hasData ? latest!.humidity : null} unit="%"
          color="bg-teal-500"
          warning={hasData && latest!.humidity > 90}
          disabled={inactive}
        />
        <SensorCard
          icon={MdWbSunny} label="조도"
          value={hasData ? latest!.lightIntensity : null} unit=" lux"
          color="bg-amber-500"
          disabled={inactive}
        />
      </div>

      <IoTCharts chartData={chartData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Irrigation Events */}
        <div className={`card ${inactive ? 'opacity-50' : ''}`}>
          <h3 className="section-title mb-3">관수 이력</h3>
          {irrigations.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">관수 이력이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {irrigations.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <span className={`w-3 h-3 rounded-full ${e.valveAction === '열림' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.reason}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.triggeredAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {e.duration > 0 && ` · ${e.duration}분`}
                    </p>
                  </div>
                  <span className={`badge text-xs ${e.valveAction === '열림' ? 'badge-info' : 'badge-success'}`}>
                    밸브 {e.valveAction}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className={`card ${inactive ? 'opacity-50' : ''}`}>
          <h3 className="section-title mb-3">센서 알림</h3>
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">알림이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a: any) => (
                <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                  a.severity === '위험' || a.severity === '경고' ? 'bg-red-50' :
                  a.severity === '주의' ? 'bg-yellow-50' : 'bg-blue-50'
                }`}>
                  <span className={`badge text-xs ${
                    a.severity === '위험' || a.severity === '경고' ? 'badge-danger' :
                    a.severity === '주의' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {a.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{a.message}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(a.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {a.resolved && <span className="text-xs text-green-600">해결됨</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
