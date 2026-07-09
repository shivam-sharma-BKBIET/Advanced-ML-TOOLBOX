from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.database import get_db, User

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Pydantic schemas for auth
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLoginJSON(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    preferences: str | None = None

    class Config:
        from_attributes = True

class PreferencesUpdate(BaseModel):
    preferences: str


@router.get("/me", response_model=UserOut)
async def get_me():
    return current_user

@router.put("/preferences", response_model=UserOut)
async def update_preferences(
    payload: PreferencesUpdate,
    db: Session = Depends(get_db)
):
    current_user.preferences = payload.preferences
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(OAuth2PasswordRequestForm),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate token
    access_token = create_access_token(data={"sub": user.username})
    return Token(
        access_token=access_token,
        token_type="bearer",
        username=user.username
    )

# Fallback JSON login endpoint to handle direct application/json request payloads
@router.post("/login-json", response_model=Token)
async def login_json(
    payload: UserLoginJSON,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return Token(
        access_token=access_token,
        token_type="bearer",
        username=user.username
    )

@router.post("/guest", response_model=Token)
async def guest_login(db: Session = Depends(get_db)):
    guest_username = "guest_user"
    user = db.query(User).filter(User.username == guest_username).first()
    if not user:
        # Create guest user if it doesn't exist
        hashed_pwd = get_password_hash("guest_password_123")
        user = User(
            username=guest_username,
            email="guest@mltoolbox.local",
            hashed_password=hashed_pwd
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    access_token = create_access_token(data={"sub": user.username})
    return Token(
        access_token=access_token,
        token_type="bearer",
        username=user.username
    )
