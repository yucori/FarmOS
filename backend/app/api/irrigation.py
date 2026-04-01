from fastapi import APIRouter

from app.core.store import add_irrigation_event, get_irrigation_events
from app.schemas.sensor import IrrigationTriggerIn

router = APIRouter(prefix="/irrigation", tags=["irrigation"])


@router.post("/trigger", status_code=201)
async def trigger_irrigation(data: IrrigationTriggerIn) -> dict:
    """수동 관개 밸브 제어 명령."""
    event = add_irrigation_event(data.valve_action, data.reason)
    return event


@router.get("/events")
async def get_events() -> list[dict]:
    """관개 이력을 반환한다."""
    return get_irrigation_events()
