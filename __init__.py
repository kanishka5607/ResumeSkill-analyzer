from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.resumes import router as resumes_router
from app.api.analyses import router as analyses_router
from app.api.jobs import router as jobs_router
from app.api.matching import router as matching_router
from app.api.learning import router as learning_router
from app.api.simulations import router as simulations_router
from app.api.dashboard import router as dashboard_router
from app.api.history import router as history_router
from app.api.graph import router as graph_router
from app.api.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(resumes_router)
api_router.include_router(analyses_router)
api_router.include_router(jobs_router)
api_router.include_router(matching_router)
api_router.include_router(learning_router)
api_router.include_router(simulations_router)
api_router.include_router(dashboard_router)
api_router.include_router(history_router)
api_router.include_router(graph_router)
api_router.include_router(admin_router)
