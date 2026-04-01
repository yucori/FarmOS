import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useScenario } from '@/context/ScenarioContext';
import { MdPlayArrow, MdReplay, MdArrowForward } from 'react-icons/md';

export default function ScenarioPage() {
  const { events, currentDay, goToDay, resetScenario } = useScenario();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-primary to-primary-light text-white">
        <h2 className="text-2xl font-bold">🍎 사과 농장 한 달 시나리오</h2>
        <p className="text-white/80 mt-1">
          가상 농업인 '김사과'씨의 30일간 FarmOS 자동화 체험
        </p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={resetScenario}
            className="flex items-center gap-1 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <MdReplay /> 처음부터
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">진행률</span>
          <span className="text-sm font-bold text-primary">Day {currentDay} / 30</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(currentDay / 30) * 100}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {events.map((event, i) => {
          const isPast = currentDay >= event.day;
          const isCurrent = currentDay === event.day;
          const isNext = !isPast && (i === 0 || currentDay >= events[i - 1].day);

          return (
            <motion.div
              key={event.day}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="relative flex gap-4"
            >
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold z-10 transition-all ${
                    isCurrent
                      ? 'bg-primary text-white ring-4 ring-primary/20 shadow-lg shadow-primary/20'
                      : isPast
                      ? 'bg-primary/80 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {event.day}
                </div>
                {i < events.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[40px] ${
                    isPast ? 'bg-primary/30' : 'bg-gray-200'
                  }`} />
                )}
              </div>

              {/* Event Card */}
              <div
                className={`flex-1 mb-4 p-5 rounded-2xl border-2 transition-all ${
                  isCurrent
                    ? 'bg-primary/5 border-primary/30 shadow-md'
                    : isPast
                    ? 'bg-white border-gray-100 hover:border-gray-200'
                    : 'bg-gray-50/50 border-gray-100 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1 font-medium">Day {event.day}</p>
                    <h3 className={`text-lg font-bold ${isCurrent ? 'text-primary' : 'text-gray-900'}`}>
                      {event.title}
                    </h3>
                    <p className="text-base text-gray-500 mt-1.5 leading-relaxed">{event.description}</p>
                  </div>
                </div>

                {(isCurrent || isPast) && (
                  <button
                    onClick={() => {
                      goToDay(event.day);
                      navigate(event.route);
                    }}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold hover:bg-primary hover:text-white transition-all cursor-pointer"
                  >
                    {isCurrent ? '이 이벤트 보기' : '다시 보기'}
                    <MdArrowForward />
                  </button>
                )}

                {isNext && !isPast && (
                  <button
                    onClick={() => goToDay(event.day)}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-500 font-medium hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                  >
                    <MdPlayArrow /> 이 날로 이동
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
