from django.db import models


class Tipo(models.Model):
    nome = models.CharField(max_length=20, unique=True)  # fire, water, dragon...

    class Meta:
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Pal(models.Model):
    paldeck_id = models.PositiveIntegerField()
    key = models.CharField(max_length=10, unique=True)  # "085", "085B" (variantes)
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True)
    imagem = models.CharField(max_length=200, blank=True)  # caminho relativo em MEDIA (pals/085.png)
    tipos = models.ManyToManyField(Tipo, blank=True)

    stats = models.JSONField(default=dict, blank=True)
    skills = models.JSONField(default=list, blank=True)
    suitability = models.JSONField(default=list, blank=True)
    drops = models.JSONField(default=list, blank=True)
    breeding_rank = models.PositiveIntegerField(null=True, blank=True)
    raridade = models.PositiveIntegerField(null=True, blank=True)
    genus = models.CharField(max_length=50, blank=True)

    descoberto = models.BooleanField(default=False)
    descoberto_em = models.DateTimeField(null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['paldeck_id', 'key']
        verbose_name_plural = 'pals'

    def __str__(self):
        return f'#{self.key} {self.nome}'


class Breeding(models.Model):
    """Combinação de pais que gera um pal filho. Cadastro manual no admin."""
    filho = models.ForeignKey(Pal, on_delete=models.CASCADE, related_name='nasce_de')
    pai = models.ForeignKey(Pal, on_delete=models.CASCADE, related_name='+')
    mae = models.ForeignKey(Pal, on_delete=models.CASCADE, related_name='+')

    class Meta:
        verbose_name = 'breeding'
        verbose_name_plural = 'breedings'
        constraints = [
            models.UniqueConstraint(fields=['filho', 'pai', 'mae'], name='breeding_unico'),
        ]

    def save(self, *args, **kwargs):
        # A+B = B+A no jogo: normaliza para não duplicar combinações invertidas
        if self.pai_id and self.mae_id and self.pai.key > self.mae.key:
            self.pai, self.mae = self.mae, self.pai
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.pai.nome} + {self.mae.nome} = {self.filho.nome}'
