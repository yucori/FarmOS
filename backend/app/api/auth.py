from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core import user_store
from app.models.user import User
from app.schemas.auth import (
    SignupRequest, LoginRequest, FindIdRequest, FindPasswordRequest,
    ResetPasswordRequest, UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_KEY = "farmos_token"


def _set_token_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_KEY,
        value=token,
        httponly=True,
        secure=False,       # 개발환경 HTTP → False, 프로덕션에서는 True
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/signup", response_model=UserResponse, status_code=201)
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    """회원가입."""
    user = await user_store.create_user(
        db, user_id=req.user_id, name=req.name, email=req.email,
        password=req.password, location=req.location,
        area=req.area, farmname=req.farmname, profile=req.profile,
    )
    if not user:
        raise HTTPException(400, "이미 사용 중인 아이디 또는 이메일입니다.")
    return UserResponse(
        user_id=user.id, name=user.name, email=user.email,
        location=user.location, area=user.area, farmname=user.farmname,
        profile=user.profile, status=user.status,
    )


@router.post("/login")
async def login(req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """로그인 — HttpOnly 쿠키로 JWT 설정."""
    user = await user_store.authenticate(db, req.user_id, req.password)
    if not user:
        raise HTTPException(401, "아이디 또는 비밀번호가 올바르지 않습니다.")
    token = create_access_token({"sub": user.id, "name": user.name})
    _set_token_cookie(response, token)
    return {"user_id": user.id, "name": user.name}


@router.post("/logout")
async def logout(response: Response):
    """로그아웃 — 쿠키 삭제."""
    response.delete_cookie(key=COOKIE_KEY, path="/")
    return {"message": "로그아웃되었습니다."}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """현재 로그인한 사용자 정보 반환 — 쿠키 토큰 검증."""
    return UserResponse(
        user_id=current_user.id, name=current_user.name, email=current_user.email,
        location=current_user.location, area=current_user.area,
        farmname=current_user.farmname, profile=current_user.profile,
        status=current_user.status,
    )


@router.post("/find-id")
async def find_id(req: FindIdRequest, db: AsyncSession = Depends(get_db)):
    """아이디 찾기 — 이름 + 이메일로 조회."""
    user = await user_store.find_by_name_and_email(db, req.name, req.email)
    if not user:
        raise HTTPException(404, "일치하는 회원 정보를 찾을 수 없습니다.")
    uid = user.id
    masked = uid[:2] + "*" * (len(uid) - 2)
    return {"user_id_masked": masked, "message": "아이디를 찾았습니다."}


@router.post("/find-password")
async def find_password(req: FindPasswordRequest, db: AsyncSession = Depends(get_db)):
    """비밀번호 찾기 — 아이디 + 이메일 확인 후 재설정 허용."""
    user = await user_store.find_by_id_and_email(db, req.user_id, req.email)
    if not user:
        raise HTTPException(404, "일치하는 회원 정보를 찾을 수 없습니다.")
    return {"verified": True, "user_id": req.user_id, "message": "본인 확인이 완료되었습니다. 새 비밀번호를 설정하세요."}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """비밀번호 재설정."""
    ok = await user_store.reset_password(db, req.user_id, req.new_password)
    if not ok:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    return {"message": "비밀번호가 성공적으로 변경되었습니다."}
