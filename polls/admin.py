from django.contrib import admin
from .models import (
    Poll, Block, TextBlock, Question, QuestionOption,
    MatrixRow, MatrixColumn, PollResponse, Answer, UserTeamsSettings,
)


class BlockInline(admin.TabularInline):
    model = Block
    extra = 0
    fields = ('block_type', 'order', 'page')
    ordering = ('order',)


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 2
    fields = ('text', 'order')
    ordering = ('order',)


class MatrixRowInline(admin.TabularInline):
    model = MatrixRow
    extra = 2
    fields = ('text', 'order')
    ordering = ('order',)


class MatrixColumnInline(admin.TabularInline):
    model = MatrixColumn
    extra = 2
    fields = ('text', 'order')
    ordering = ('order',)


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'status', 'is_anonymous', 'total_responses', 'created_at')
    list_filter = ('status', 'is_anonymous', 'created_at')
    search_fields = ('title', 'creator__username', 'custom_id')
    readonly_fields = ('guid', 'created_at', 'updated_at')
    inlines = [BlockInline]
    fieldsets = (
        ('Allgemein', {
            'fields': ('title', 'creator', 'guid', 'custom_id', 'status'),
        }),
        ('Einstellungen', {
            'fields': (
                'is_anonymous', 'show_vote_count', 'allow_multiple_responses',
                'questions_per_page',
            ),
        }),
        ('Zeitraum', {
            'fields': ('start_date', 'end_date'),
        }),
        ('Metadaten', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('id', 'poll', 'block_type', 'order', 'page')
    list_filter = ('block_type',)
    search_fields = ('poll__title',)


@admin.register(TextBlock)
class TextBlockAdmin(admin.ModelAdmin):
    list_display = ('id', 'block', 'content_preview')
    search_fields = ('content',)

    def content_preview(self, obj):
        return obj.content[:60] + '...' if len(obj.content) > 60 else obj.content
    content_preview.short_description = 'Inhalt'


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('title', 'question_type', 'required', 'block')
    list_filter = ('question_type', 'required')
    search_fields = ('title',)
    inlines = [QuestionOptionInline, MatrixRowInline, MatrixColumnInline]


@admin.register(QuestionOption)
class QuestionOptionAdmin(admin.ModelAdmin):
    list_display = ('text', 'question', 'order')
    search_fields = ('text', 'question__title')


@admin.register(MatrixRow)
class MatrixRowAdmin(admin.ModelAdmin):
    list_display = ('text', 'question', 'order')


@admin.register(MatrixColumn)
class MatrixColumnAdmin(admin.ModelAdmin):
    list_display = ('text', 'question', 'order')


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    readonly_fields = ('question', 'value', 'file')
    can_delete = False


@admin.register(PollResponse)
class PollResponseAdmin(admin.ModelAdmin):
    list_display = ('poll', 'user', 'completed', 'current_page', 'submitted_at')
    list_filter = ('completed', 'poll')
    search_fields = ('poll__title', 'user__username')
    readonly_fields = ('submitted_at',)
    inlines = [AnswerInline]


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('question', 'response', 'value_preview')
    search_fields = ('question__title',)

    def value_preview(self, obj):
        if obj.value is None:
            return '-'
        val = str(obj.value)
        return val[:60] + '...' if len(val) > 60 else val
    value_preview.short_description = 'Wert'


@admin.register(UserTeamsSettings)
class UserTeamsSettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_configured', 'tenant_id_preview')
    search_fields = ('user__username',)

    def tenant_id_preview(self, obj):
        return obj.tenant_id[:20] + '...' if len(obj.tenant_id) > 20 else obj.tenant_id
    tenant_id_preview.short_description = 'Tenant ID'
