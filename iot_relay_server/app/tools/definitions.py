"""AI Agent Tool 정의 — OpenAI Function Calling 스키마."""

# Phase 1: 읽기 전용 Tools
SENSOR_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_sensors",
            "description": "현재 온실 내부 센서값을 읽습니다 (온도, 대기습도, 조도, 토양수분). 토양수분은 가상 계산값입니다.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_weather",
            "description": "현재 외부 기상 실황과 3/6/12시간 후 예보를 읽습니다.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_crop_profile",
            "description": "현재 재배 중인 작물의 적정 환경 조건을 읽습니다 (적정 온도, 습도, 광시간, 양액 비율).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_control_state",
            "description": "현재 온실 제어 장치 상태를 읽습니다 (환기, 관수, 조명, 차광/보온).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

# Phase 2: 환기 제어 Tool
VENTILATION_TOOL = {
    "type": "function",
    "function": {
        "name": "control_ventilation",
        "description": "온실 환기 장치를 제어합니다. 창문 개방률과 환기팬 속도를 설정합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "window_open_pct": {
                    "type": "integer",
                    "description": "창문 개방률 (0~100%)",
                    "minimum": 0,
                    "maximum": 100,
                },
                "fan_speed": {
                    "type": "integer",
                    "description": "환기팬 속도 (0~3000 RPM)",
                    "minimum": 0,
                    "maximum": 3000,
                },
                "reason": {
                    "type": "string",
                    "description": "제어 판단 근거 (한국어로 작성)",
                },
            },
            "required": ["window_open_pct", "fan_speed", "reason"],
        },
    },
}

# Phase 3: 관수/양액 제어 Tool
IRRIGATION_TOOL = {
    "type": "function",
    "function": {
        "name": "control_irrigation",
        "description": "관수 밸브와 양액 공급을 제어합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "valve_open": {
                    "type": "boolean",
                    "description": "밸브 열림(true) / 닫힘(false)",
                },
                "water_amount_L": {
                    "type": "number",
                    "description": "급수량 (리터, 0~20)",
                    "minimum": 0,
                    "maximum": 20,
                },
                "nutrient_N": {
                    "type": "number",
                    "description": "질소(N) 비율 (0~3.0)",
                    "minimum": 0,
                    "maximum": 3,
                },
                "nutrient_P": {
                    "type": "number",
                    "description": "인산(P) 비율 (0~3.0)",
                    "minimum": 0,
                    "maximum": 3,
                },
                "nutrient_K": {
                    "type": "number",
                    "description": "칼륨(K) 비율 (0~3.0)",
                    "minimum": 0,
                    "maximum": 3,
                },
                "reason": {
                    "type": "string",
                    "description": "제어 판단 근거 (한국어로 작성)",
                },
            },
            "required": ["valve_open", "reason"],
        },
    },
}

# Phase 4: 조명 제어 Tool
LIGHTING_TOOL = {
    "type": "function",
    "function": {
        "name": "control_lighting",
        "description": "보광등을 제어합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "on": {
                    "type": "boolean",
                    "description": "보광등 켜기(true) / 끄기(false)",
                },
                "brightness_pct": {
                    "type": "integer",
                    "description": "밝기 (0~100%)",
                    "minimum": 0,
                    "maximum": 100,
                },
                "reason": {
                    "type": "string",
                    "description": "제어 판단 근거 (한국어로 작성)",
                },
            },
            "required": ["on", "brightness_pct", "reason"],
        },
    },
}

# Phase 5: 차광/보온 제어 Tool
SHADING_TOOL = {
    "type": "function",
    "function": {
        "name": "control_shading",
        "description": "차광막과 보온커튼을 제어합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "shade_pct": {
                    "type": "integer",
                    "description": "차광막 (0~100%)",
                    "minimum": 0,
                    "maximum": 100,
                },
                "insulation_pct": {
                    "type": "integer",
                    "description": "보온커튼 (0~100%)",
                    "minimum": 0,
                    "maximum": 100,
                },
                "reason": {
                    "type": "string",
                    "description": "제어 판단 근거 (한국어로 작성)",
                },
            },
            "required": ["shade_pct", "insulation_pct", "reason"],
        },
    },
}


def get_active_tools(enabled_phases: int = 2) -> list[dict]:
    """활성화된 Phase까지의 Tool 목록을 반환한다.

    enabled_phases:
        1 = 읽기 전용 (센서/기상/작물/제어상태)
        2 = + 환기
        3 = + 관수
        4 = + 조명
        5 = + 차광/보온
    """
    tools = list(SENSOR_TOOLS)
    if enabled_phases >= 2:
        tools.append(VENTILATION_TOOL)
    if enabled_phases >= 3:
        tools.append(IRRIGATION_TOOL)
    if enabled_phases >= 4:
        tools.append(LIGHTING_TOOL)
    if enabled_phases >= 5:
        tools.append(SHADING_TOOL)
    return tools
