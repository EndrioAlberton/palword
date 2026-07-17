from django.contrib import admin, messages
from django.shortcuts import redirect
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html

from .models import Tipo, Pal, Breeding


@admin.register(Tipo)
class TipoAdmin(admin.ModelAdmin):
    search_fields = ('nome',)


class BreedingInline(admin.TabularInline):
    model = Breeding
    fk_name = 'filho'
    extra = 1
    autocomplete_fields = ('pai', 'mae')
    verbose_name = 'combinação de breeding'
    verbose_name_plural = 'nasce de (combinações de breeding)'


@admin.register(Pal)
class PalAdmin(admin.ModelAdmin):
    list_display = ('key', 'imagem_thumb', 'nome', 'tipos_display', 'breeding_rank', 'descoberto', 'descoberto_em')
    list_filter = ('descoberto', 'tipos')
    search_fields = ('key', 'nome')
    ordering = ('paldeck_id', 'key')
    actions = ('marcar_descoberto', 'desmarcar_descoberto')
    inlines = (BreedingInline,)
    readonly_fields = ('atualizado_em',)
    change_list_template = 'admin/paldeck/pal/change_list.html'

    fieldsets = (
        ('Pal', {'fields': ('paldeck_id', 'key', 'nome', 'descricao', 'imagem', 'tipos', 'genus', 'raridade')}),
        ('Descoberta', {'fields': ('descoberto', 'descoberto_em')}),
        ('Dados do jogo (importados)', {
            'classes': ('collapse',),
            'fields': ('breeding_rank', 'stats', 'skills', 'suitability', 'drops'),
        }),
        ('Metadados', {'fields': ('atualizado_em',)}),
    )

    def get_urls(self):
        urls = super().get_urls()
        extra = [
            path('importar/', self.admin_site.admin_view(self.importar_view), name='paldeck_pal_importar'),
            path('marcar-descoberto/', self.admin_site.admin_view(self.marcar_descoberto_view), name='paldeck_pal_marcar_descoberto'),
        ]
        return extra + urls

    def importar_view(self, request):
        from paldeck.management.commands.importar_pals import importar_pals
        try:
            criados, atualizados, erros_imagem = importar_pals()
        except Exception as exc:
            self.message_user(request, f'Falha na importação: {exc}', messages.ERROR)
            return redirect('../')
        nivel = messages.SUCCESS if not erros_imagem else messages.WARNING
        self.message_user(request, f'{criados} pals criados, {atualizados} atualizados, {erros_imagem} imagens falharam.', nivel)
        return redirect('../')

    def marcar_descoberto_view(self, request):
        busca = (request.POST.get('busca') or '').strip()
        if request.method != 'POST' or not busca:
            return redirect('../')
        pal = Pal.objects.filter(key__iexact=busca).first()
        if not pal and busca.isdigit():
            pal = Pal.objects.filter(paldeck_id=int(busca), key=busca.zfill(3)).first() \
                or Pal.objects.filter(paldeck_id=int(busca)).first()
        if not pal:
            self.message_user(request, f'Nenhum pal encontrado com ID/key "{busca}".', messages.ERROR)
        elif pal.descoberto:
            self.message_user(request, f'{pal} já estava descoberto.', messages.INFO)
        else:
            pal.descoberto = True
            pal.descoberto_em = timezone.now()
            pal.save(update_fields=['descoberto', 'descoberto_em', 'atualizado_em'])
            self.message_user(request, f'{pal} marcado como descoberto!', messages.SUCCESS)
        return redirect('../')

    def marcar_descoberto(self, request, queryset):
        n = queryset.filter(descoberto=False).update(descoberto=True, descoberto_em=timezone.now())
        self.message_user(request, f'{n} pals marcados como descobertos.', messages.SUCCESS)
    marcar_descoberto.short_description = 'Marcar como descoberto'

    def desmarcar_descoberto(self, request, queryset):
        n = queryset.update(descoberto=False, descoberto_em=None)
        self.message_user(request, f'{n} pals desmarcados.', messages.SUCCESS)
    desmarcar_descoberto.short_description = 'Desmarcar descoberto'

    def imagem_thumb(self, obj):
        if not obj.imagem:
            return '—'
        return format_html('<img src="/media/{}" style="height:32px;border-radius:50%">', obj.imagem)
    imagem_thumb.short_description = ''

    def tipos_display(self, obj):
        return ', '.join(t.nome for t in obj.tipos.all())
    tipos_display.short_description = 'Tipos'

    def get_search_results(self, request, queryset, search_term):
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        if request.GET.get('field_name') in ('pai', 'mae', 'filho'):
            queryset = queryset.filter(descoberto=True)
        return queryset, use_distinct


@admin.register(Breeding)
class BreedingAdmin(admin.ModelAdmin):
    list_display = ('pai', 'mae', 'filho')
    search_fields = ('pai__nome', 'mae__nome', 'filho__nome', 'pai__key', 'mae__key', 'filho__key')
    autocomplete_fields = ('pai', 'mae', 'filho')
    list_select_related = ('pai', 'mae', 'filho')
