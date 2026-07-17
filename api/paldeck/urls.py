from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PalViewSet, LoginView, PalBreedingCreateView, PalSkillCreateView

router = DefaultRouter()
router.register('pals', PalViewSet, basename='pal')

urlpatterns = router.urls + [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('pals/<str:key>/breeding/', PalBreedingCreateView.as_view(), name='pal-breeding-create'),
    path('pals/<str:key>/skills/', PalSkillCreateView.as_view(), name='pal-skill-create'),
]
