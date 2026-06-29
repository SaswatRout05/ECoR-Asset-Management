"""
ECoR-OAMS  ·  Auth Routes
POST /api/auth/login   — Authenticate & receive JWT
GET  /api/auth/me      — Current user info
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..auth import verify_password, create_token, get_current_user
from ..schemas import LoginRequest, LoginResponse, UserInfo

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token with embedded role."""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    # CR-2026-009: Block inactive users
    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact IT Admin.",
        )
    token = create_token(user)
    return LoginResponse(
        access_token=token,
        role=user.role.value if hasattr(user.role, "value") else user.role,
        full_name=user.full_name,
    )


@router.get("/me", response_model=UserInfo)
def get_me(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's identity & role."""
    return UserInfo(**current_user)
