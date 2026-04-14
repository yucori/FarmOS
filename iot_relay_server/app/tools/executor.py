"""Tool 실행 디스패처 — AI Agent의 tool_call 요청을 실제 함수로 매핑."""

from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))


_trigger_sensor_snapshot: dict | None = None


def set_sensor_snapshot(data: dict | None) -> None:
    """LLM 루프 실행 전 trigger 시점의 센서 데이터를 설정한다."""
    global _trigger_sensor_snapshot
    _trigger_sensor_snapshot = data


async def execute_tool(name: str, arguments: dict) -> dict:
    """Tool 이름으로 핸들러를 찾아 실행하고 결과를 반환한다."""
    handler = _HANDLERS.get(name)
    if handler is None:
        return {"error": f"Unknown tool: {name}"}
    return await handler(arguments)


# ── 읽기 Tools ──────────────────────────────────────────────


async def _read_sensors(_args: dict) -> dict:
    # trigger 시점 스냅샷이 있으면 그 값을 반환 (ESP8266 덮어쓰기 방지)
    if _trigger_sensor_snapshot is not None:
        return {
            **_trigger_sensor_snapshot,
            "note": "토양수분은 온도/습도/조도 기반 가상 계산값입니다.",
        }

    from app.store import get_latest

    latest = get_latest()
    if latest is None:
        return {"error": "센서 데이터 없음. ESP8266 연결을 확인하세요."}

    return {
        "temperature": latest["temperature"],
        "humidity": latest["humidity"],
        "light_intensity": latest["lightIntensity"],
        "soil_moisture": latest["soilMoisture"],
        "timestamp": latest["timestamp"],
        "note": "토양수분은 온도/습도/조도 기반 가상 계산값입니다.",
    }


async def _read_weather(_args: dict) -> dict:
    from app.weather_client import get_weather
    from app.store import get_latest

    latest = get_latest()
    sensor_data = None
    if latest:
        sensor_data = {
            "temperature": latest["temperature"],
            "humidity": latest["humidity"],
        }

    weather = await get_weather(sensor_data)
    return weather


async def _read_crop_profile(_args: dict) -> dict:
    from app.ai_agent import crop_profile

    return dict(crop_profile)


async def _read_control_state(_args: dict) -> dict:
    from app.ai_agent import control_state

    import copy
    return copy.deepcopy(control_state)


# ── 제어 Tools (Phase 2+) ───────────────────────────────────


async def _control_ventilation(args: dict) -> dict:
    from app.ai_agent import control_state, _record_decision
    from app.store import _broadcast

    window_pct = max(0, min(100, args.get("window_open_pct", 0)))
    fan_speed = max(0, min(3000, args.get("fan_speed", 0)))
    reason = args.get("reason", "")

    control_state["ventilation"]["window_open_pct"] = window_pct
    control_state["ventilation"]["fan_speed"] = fan_speed

    decision = _record_decision(
        control_type="ventilation",
        action={"window_open_pct": window_pct, "fan_speed": fan_speed},
        reason=reason,
        source="tool",
    )
    _broadcast("ai_decision", decision)

    return {
        "success": True,
        "applied": {"window_open_pct": window_pct, "fan_speed": fan_speed},
        "reason": reason,
    }


async def _control_irrigation(args: dict) -> dict:
    from app.ai_agent import control_state, _record_decision
    from app.store import _broadcast, add_irrigation_event

    valve_open = args.get("valve_open", False)
    water_amount = max(0, min(20, args.get("water_amount_L", 0)))
    n = max(0, min(3, args.get("nutrient_N", 1.0)))
    p = max(0, min(3, args.get("nutrient_P", 1.0)))
    k = max(0, min(3, args.get("nutrient_K", 1.0)))
    reason = args.get("reason", "")

    control_state["irrigation"]["valve_open"] = valve_open
    if valve_open and water_amount > 0:
        control_state["irrigation"]["daily_total_L"] += water_amount
        control_state["irrigation"]["last_watered"] = datetime.now(KST).isoformat()
    control_state["irrigation"]["nutrient"] = {"N": n, "P": p, "K": k}

    decision = _record_decision(
        control_type="irrigation",
        action={
            "valve_open": valve_open,
            "water_amount_L": water_amount,
            "nutrient": {"N": n, "P": p, "K": k},
        },
        reason=reason,
        source="tool",
    )
    _broadcast("ai_decision", decision)

    if valve_open:
        add_irrigation_event("열림", f"[AI] {reason}")

    return {
        "success": True,
        "applied": {
            "valve_open": valve_open,
            "water_amount_L": water_amount,
            "nutrient": {"N": n, "P": p, "K": k},
        },
        "reason": reason,
    }


async def _control_lighting(args: dict) -> dict:
    from app.ai_agent import control_state, _record_decision
    from app.store import _broadcast

    on = args.get("on", False)
    brightness = max(0, min(100, args.get("brightness_pct", 0)))
    reason = args.get("reason", "")

    control_state["lighting"]["on"] = on
    control_state["lighting"]["brightness_pct"] = brightness if on else 0

    decision = _record_decision(
        control_type="lighting",
        action={"on": on, "brightness_pct": brightness},
        reason=reason,
        source="tool",
    )
    _broadcast("ai_decision", decision)

    return {
        "success": True,
        "applied": {"on": on, "brightness_pct": brightness},
        "reason": reason,
    }


async def _control_shading(args: dict) -> dict:
    from app.ai_agent import control_state, _record_decision
    from app.store import _broadcast

    shade = max(0, min(100, args.get("shade_pct", 0)))
    insulation = max(0, min(100, args.get("insulation_pct", 0)))
    reason = args.get("reason", "")

    control_state["shading"]["shade_pct"] = shade
    control_state["shading"]["insulation_pct"] = insulation

    decision = _record_decision(
        control_type="shading",
        action={"shade_pct": shade, "insulation_pct": insulation},
        reason=reason,
        source="tool",
    )
    _broadcast("ai_decision", decision)

    return {
        "success": True,
        "applied": {"shade_pct": shade, "insulation_pct": insulation},
        "reason": reason,
    }


# ── 핸들러 레지스트리 ────────────────────────────────────────

_HANDLERS = {
    "read_sensors": _read_sensors,
    "read_weather": _read_weather,
    "read_crop_profile": _read_crop_profile,
    "read_control_state": _read_control_state,
    "control_ventilation": _control_ventilation,
    "control_irrigation": _control_irrigation,
    "control_lighting": _control_lighting,
    "control_shading": _control_shading,
}
