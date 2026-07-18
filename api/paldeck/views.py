from django.contrib.auth import authenticate
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Pal, Breeding
from .serializers import (
    PalListSerializer, PalDetailSerializer,
    BreedingCreateSerializer,
)


class PalViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = 'key'
    pagination_class = None

    def get_queryset(self):
        qs = Pal.objects.prefetch_related('tipos')
        if self.action == 'retrieve':
            qs = qs.prefetch_related('nasce_de__pai', 'nasce_de__mae')
        descoberto = self.request.query_params.get('descoberto')
        if descoberto is not None:
            qs = qs.filter(descoberto=descoberto.lower() in ('1', 'true', 'sim'))
        return qs

    def get_serializer_class(self):
        return PalDetailSerializer if self.action == 'retrieve' else PalListSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_staff:
            return Response({'detail': 'Usuário ou senha inválidos.'}, status=status.HTTP_401_UNAUTHORIZED)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'username': user.username})


class PalDescobrirView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        busca = str(request.data.get('busca', '')).strip()
        if not busca:
            return Response({'detail': 'Informe o número do pal.'}, status=status.HTTP_400_BAD_REQUEST)
        pal = Pal.buscar_por_id_ou_key(busca)
        if not pal:
            return Response({'detail': f'Nenhum pal encontrado com "{busca}".'}, status=status.HTTP_404_NOT_FOUND)
        ja_descoberto = pal.descoberto
        if not ja_descoberto:
            pal.descoberto = True
            pal.descoberto_em = timezone.now()
            pal.save(update_fields=['descoberto', 'descoberto_em', 'atualizado_em'])
        return Response({'key': pal.key, 'nome': pal.nome, 'ja_descoberto': ja_descoberto})


class PalBreedingCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, key):
        filho = get_object_or_404(Pal, key=key)
        serializer = BreedingCreateSerializer(data=request.data, context={'filho': filho})
        serializer.is_valid(raise_exception=True)
        try:
            breeding = serializer.save()
        except IntegrityError:
            return Response({'detail': 'Essa combinação de breeding já existe.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {'id': breeding.id, 'pai': breeding.pai.key, 'mae': breeding.mae.key},
            status=status.HTTP_201_CREATED,
        )
