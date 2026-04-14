# IoT AI Agent Automation - 추가 요구사항

> **Date**: 2026-04-14
> **Author**: clover0309
> **Status**: 수집 중

---

## 요구사항 1: API → MCP 도구화 (Tool Use 패턴)

### 핵심 변경
- 기존 Plan: AI Agent가 REST API를 호출하여 센서 읽기/제어 명령 전달
- **변경**: IoT 센서 및 제어 장치를 **MCP Tool** 형태로 도구화하여, AI Agent가 도구 호출(Tool Use) 방식으로 자율 판단/실행

### 개념 구조

```
AI Agent (LLM: gpt-5-mini via OpenRouter)
    │
    ├─ [Tool] 센서 데이터 조회
    │   - get_sensor_data(): 온도, 습도, 조도, 토양수분
    │   - get_weather_forecast(): 기상청 실황/예보
    │
    ├─ [Tool] 제어 장치 조작
    │   - control_ventilation(window_pct, fan_speed): 환기팬 가동
    │   - control_irrigation(amount_L, nutrient_ratio): 관수/양액
    │   - control_lighting(on_off, brightness_pct): 조명 제어
    │   - control_shading(shade_pct, insulation_pct): 암막커튼/보온커튼
    │
    └─ [Tool] 상태 조회/로깅
        - get_control_state(): 현재 제어 상태
        - log_decision(reason, action): 판단 기록
```

### 기대 동작 흐름

1. AI Agent가 주기적으로 센서 데이터 Tool 호출
2. 특정 조건 감지 시 (예: 토양습도 < 40%, 온도 > 35C, 조도 < 10000 lux)
3. AI Agent가 자율적으로 적절한 제어 Tool을 선택하여 호출
4. 판단 근거와 실행 결과를 로그로 기록

### 기술 결정사항
- **LLM**: gpt-5-mini (OpenRouter 경유)
- **MCP 서버**: IoT Relay Server를 MCP Server로 래핑 또는 별도 MCP 서버 구축
- **브랜치**: refact/iotdashboard에서 확장

---

## 요구사항 2: 순차적 기능 구현 + 실 테스트 검증 사이클

### 구현 순서 (단계별 검증 필수)

각 기능을 하나씩 구현하고, 사용자가 직접 실 테스트를 완료한 뒤 다음 기능으로 진행한다.

```
[1] 환기 제어 구현 → 사용자 실 테스트 → 통과 확인
    ↓
[2] 관수/양액 제어 구현 → 사용자 실 테스트 → 통과 확인
    ↓
[3] 조명 제어 구현 → 사용자 실 테스트 → 통과 확인
    ↓
[4] 차광/보온 제어 구현 → 사용자 실 테스트 → 통과 확인
```

### 테스트 프로세스
- 각 기능 구현 완료 시, 사용자에게 **테스트 방법을 구체적으로 안내**
- 사용자가 직접 테스트 후 정상 작동 확인 → 다음 기능 진행
- 비정상 시 해당 기능 수정 후 재테스트

### 하드웨어 현황 (제약사항)

| 센서/장치 | 상태 | 비고 |
|-----------|------|------|
| ESP8266 | **정상 통신 중** | HTTP POST로 30초 간격 데이터 전송 |
| DHT11 (온도) | **실측** | ESP8266에 연결, 실시간 수신 중 |
| DHT11 (대기습도) | **실측** | ESP8266에 연결, 실시간 수신 중 |
| KY-018 LDR (조도) | **실측** | ESP8266에 연결, 실시간 수신 중 |
| 토양수분 센서 | **미연결** | ESP8266에 물리적으로 연결되어 있지 않음 |

### 토양수분 가상 계산

- 토양수분은 실제 센서가 아닌 **가상 계산값**
- 온도, 대기습도, 조도 3개 실측값을 기반으로 추정 계산
- 현재 IoT Relay Server에서 이미 이 로직이 작동 중
- AI Agent 구현 시 이 가상 토양수분값을 그대로 사용

---

## 요구사항 3: 기존 미완성 코드 클린업 허용

### 현황
- 현재 코드베이스에 AI Agent 관련 **구현이 중간까지 진행된 코드**가 존재
- 해당 코드들에 **버그가 다수** 포함되어 있음
- 기존 코드를 베이스로 활용해도 되지만, **전부 제거 후 새로 구현해도 무관**

### 결정
- 기존 미완성 AI Agent 코드는 **참고용으로만 활용** 가능
- Design 단계에서 기존 코드 분석 후 재사용 여부 판단
- 필요시 기존 코드를 **제거하고 클린 상태에서 재구현** 가능
- 기존 코드의 좋은 패턴은 가져가되, 버그 있는 로직은 새로 작성

### 관련 파일 (기존 미완성 코드)
- `iot_relay_server/app/ai_agent.py` — AI 판단 로직 (미완성)
- `iot_relay_server/app/ai_agent_prompts.py` — AI 프롬프트 (미완성)
- `frontend/src/modules/iot/AIAgentPanel.tsx` — AI Agent UI 패널 (미완성)

---
