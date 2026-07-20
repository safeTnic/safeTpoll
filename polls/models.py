import uuid
import json
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Poll(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Entwurf'),
        ('active', 'Aktiv'),
        ('closed', 'Geschlossen'),
    ]
    title = models.CharField(max_length=255)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='polls')
    guid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    custom_id = models.SlugField(max_length=100, blank=True, null=True, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_anonymous = models.BooleanField(default=True)
    show_vote_count = models.BooleanField(default=True)
    allow_multiple_responses = models.BooleanField(default=False)
    pinned = models.BooleanField(default=False)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    questions_per_page = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def get_url_id(self):
        return self.custom_id if self.custom_id else str(self.guid)

    def is_active(self):
        if self.status != 'active':
            return False
        now = timezone.now()
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True

    def total_responses(self):
        return self.responses.filter(completed=True).count()


class Block(models.Model):
    BLOCK_TYPES = [
        ('text', 'Textblock'),
        ('question', 'Frage'),
    ]
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='blocks')
    block_type = models.CharField(max_length=20, choices=BLOCK_TYPES)
    order = models.IntegerField(default=0)
    page = models.IntegerField(default=1)

    class Meta:
        ordering = ['order']


class TextBlock(models.Model):
    block = models.OneToOneField(Block, on_delete=models.CASCADE, related_name='text_content')
    content = models.TextField()


class Question(models.Model):
    QUESTION_TYPES = [
        ('single_choice', 'Einfachauswahl'),
        ('multiple_choice', 'Mehrfachauswahl'),
        ('text', 'Einzeiliger Text'),
        ('textarea', 'Mehrzeiliger Text'),
        ('number', 'Zahl'),
        ('rating', 'Bewertung/Skala'),
        ('ranking', 'Ranking'),
        ('matrix', 'Matrix'),
        ('date', 'Datum/Uhrzeit'),
        ('file', 'Datei-Upload'),
    ]
    block = models.OneToOneField(Block, on_delete=models.CASCADE, related_name='question')
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    question_type = models.CharField(max_length=30, choices=QUESTION_TYPES)
    required = models.BooleanField(default=True)
    settings = models.JSONField(default=dict)


class QuestionOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=500)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']


class MatrixRow(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='matrix_rows')
    text = models.CharField(max_length=500)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']


class MatrixColumn(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='matrix_columns')
    text = models.CharField(max_length=500)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']


class PollResponse(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='responses')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    current_page = models.IntegerField(default=1)

    def __str__(self):
        return f"Response to {self.poll.title} by {self.user}"


class Answer(models.Model):
    response = models.ForeignKey(PollResponse, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    value = models.JSONField(null=True, blank=True)
    file = models.FileField(upload_to='answers/%Y/%m/', null=True, blank=True)

    class Meta:
        unique_together = ['response', 'question']


class UserTeamsSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teams_settings')
    tenant_id = models.CharField(max_length=200, blank=True)
    client_id = models.CharField(max_length=200, blank=True)
    client_secret = models.CharField(max_length=500, blank=True)

    def is_configured(self):
        return bool(self.tenant_id and self.client_id and self.client_secret)
