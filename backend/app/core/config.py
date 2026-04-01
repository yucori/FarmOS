from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "FarmOS Backend"
    API_V1_PREFIX: str = "/api/v1"

    # Database (PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/farmos"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Sensor thresholds
    SOIL_MOISTURE_LOW: float = 55.0
    SOIL_MOISTURE_HIGH: float = 70.0

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
