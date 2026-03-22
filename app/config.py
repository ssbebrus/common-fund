from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Common Fund 'КОНДИЦИИ'"
    DATABASE_URL: str
    ADMIN_SECRET_TOKEN: str
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
