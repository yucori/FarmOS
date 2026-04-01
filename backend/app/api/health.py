from fastapi import APIRouter

from app.core.store import sensor_readings, irrigation_events, sensor_alerts

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """서버 상태 및 인메모리 데이터 현황."""
    return {
        "status": "ok",
        "storage": "in-memory",
        "readings_count": len(sensor_readings),
        "irrigation_events_count": len(irrigation_events),
        "alerts_count": len(sensor_alerts),
    }
