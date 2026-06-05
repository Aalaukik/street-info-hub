from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import get_settings

security = HTTPBearer()


def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> bool:
    settings = get_settings()
    if credentials.credentials != settings.admin_secret_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing admin token",
        )
    return True
