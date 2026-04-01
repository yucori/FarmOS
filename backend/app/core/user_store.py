"""PostgreSQL 기반 사용자 저장소."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User


async def find_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id, User.status == 1))
    return result.scalar_one_or_none()


async def find_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email, User.status == 1))
    return result.scalar_one_or_none()


async def find_by_name_and_email(db: AsyncSession, name: str, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.name == name, User.email == email, User.status == 1)
    )
    return result.scalar_one_or_none()


async def find_by_id_and_email(db: AsyncSession, user_id: str, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.id == user_id, User.email == email, User.status == 1)
    )
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession, user_id: str, name: str, email: str, password: str,
    location: str = "", area: float = 0.0, farmname: str = "", profile: str = "",
) -> User | None:
    if await find_by_id(db, user_id):
        return None
    if await find_by_email(db, email):
        return None
    user = User(
        id=user_id, name=name, email=email,
        password=hash_password(password),
        location=location, area=area, farmname=farmname, profile=profile,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, user_id: str, password: str) -> User | None:
    user = await find_by_id(db, user_id)
    if user and verify_password(password, user.password):
        return user
    return None


async def reset_password(db: AsyncSession, user_id: str, new_password: str) -> bool:
    user = await find_by_id(db, user_id)
    if not user:
        return False
    user.password = hash_password(new_password)
    await db.commit()
    return True
