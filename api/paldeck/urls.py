from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PalViewSet, LoginView, PalBreedingCreateView, PalDescobrirView

router = DefaultRouter()
router.register('pals', PalViewSet, basename='pal')

# rotas fixas antes do router: senão pals/<key>/ captura "descobrir" como key
urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('pals/descobrir/', PalDescobrirView.as_view(), name='pal-descobrir'),
    path('pals/<str:key>/breeding/', PalBreedingCreateView.as_view(), name='pal-breeding-create'),
] + router.urls
