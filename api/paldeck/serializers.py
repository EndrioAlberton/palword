from django.conf import settings
from rest_framework import serializers
from .models import Pal, Breeding


class PalMiniSerializer(serializers.ModelSerializer):
    imagem_url = serializers.SerializerMethodField()

    class Meta:
        model = Pal
        fields = ['paldeck_id', 'key', 'nome', 'imagem_url', 'descoberto']

    def get_imagem_url(self, obj):
        if not obj.imagem:
            return None
        url = settings.MEDIA_URL + obj.imagem
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url


class BreedingSerializer(serializers.ModelSerializer):
    pai = PalMiniSerializer(read_only=True)
    mae = PalMiniSerializer(read_only=True)

    class Meta:
        model = Breeding
        fields = ['id', 'pai', 'mae']


class PalListSerializer(PalMiniSerializer):
    tipos = serializers.SlugRelatedField(slug_field='nome', many=True, read_only=True)

    class Meta(PalMiniSerializer.Meta):
        fields = PalMiniSerializer.Meta.fields + ['tipos', 'raridade', 'suitability', 'passiva']


class PalDetailSerializer(PalListSerializer):
    nasce_de = BreedingSerializer(many=True, read_only=True)

    class Meta(PalListSerializer.Meta):
        fields = PalListSerializer.Meta.fields + [
            'descricao', 'genus', 'stats', 'suitability', 'drops',
            'tamanho', 'passiva', 'passiva_descricao', 'equipamento',
            'taxa_fome', 'noturno', 'preco_venda',
            'nasce_de', 'descoberto_em', 'atualizado_em',
        ]


class BreedingCreateSerializer(serializers.ModelSerializer):
    pai_key = serializers.CharField(write_only=True)
    mae_key = serializers.CharField(write_only=True)

    class Meta:
        model = Breeding
        fields = ['id', 'pai_key', 'mae_key']

    def validate(self, attrs):
        try:
            attrs['pai'] = Pal.objects.get(key=attrs['pai_key'], descoberto=True)
        except Pal.DoesNotExist:
            raise serializers.ValidationError({'pai_key': 'Pal não encontrado ou não descoberto.'})
        try:
            attrs['mae'] = Pal.objects.get(key=attrs['mae_key'], descoberto=True)
        except Pal.DoesNotExist:
            raise serializers.ValidationError({'mae_key': 'Pal não encontrado ou não descoberto.'})
        return attrs

    def create(self, validated_data):
        return Breeding.objects.create(
            filho=self.context['filho'],
            pai=validated_data['pai'],
            mae=validated_data['mae'],
        )
