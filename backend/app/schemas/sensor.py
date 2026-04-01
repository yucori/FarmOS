from datetime import datetime

from pydantic import BaseModel, Field


class SensorValues(BaseModel):
    """ESP8266에서 전송하는 센서 값.
    - temperature, humidity, light_intensity: ESP8266 실측값 (필수)
    - soil_moisture: 센서 미보유 → 서버에서 랜덤 생성 (선택)
    """
    temperature: float = Field(ge=-40, le=80)
    humidity: float = Field(ge=0, le=100)
    light_intensity: int = Field(ge=0, le=100000)
    soil_moisture: float | None = Field(default=None, ge=0, le=100)


class SensorDataIn(BaseModel):
    """ESP8266 -> Backend POST payload."""
    device_id: str
    timestamp: datetime | None = None
    sensors: SensorValues


class IrrigationTriggerIn(BaseModel):
    valve_action: str = Field(pattern=r"^(열림|닫힘)$")
    reason: str = ""
