import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Poll',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('guid', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('custom_id', models.SlugField(blank=True, max_length=100, null=True, unique=True)),
                ('status', models.CharField(
                    choices=[('draft', 'Entwurf'), ('active', 'Aktiv'), ('closed', 'Geschlossen')],
                    default='draft', max_length=20,
                )),
                ('is_anonymous', models.BooleanField(default=True)),
                ('show_vote_count', models.BooleanField(default=True)),
                ('allow_multiple_responses', models.BooleanField(default=False)),
                ('start_date', models.DateTimeField(blank=True, null=True)),
                ('end_date', models.DateTimeField(blank=True, null=True)),
                ('questions_per_page', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('creator', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='polls',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='Block',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('block_type', models.CharField(
                    choices=[('text', 'Textblock'), ('question', 'Frage')],
                    max_length=20,
                )),
                ('order', models.IntegerField(default=0)),
                ('page', models.IntegerField(default=1)),
                ('poll', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='blocks',
                    to='polls.poll',
                )),
            ],
            options={'ordering': ['order']},
        ),
        migrations.CreateModel(
            name='TextBlock',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('block', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='text_content',
                    to='polls.block',
                )),
            ],
        ),
        migrations.CreateModel(
            name='Question',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=500)),
                ('description', models.TextField(blank=True)),
                ('question_type', models.CharField(
                    choices=[
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
                    ],
                    max_length=30,
                )),
                ('required', models.BooleanField(default=True)),
                ('settings', models.JSONField(default=dict)),
                ('block', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='question',
                    to='polls.block',
                )),
            ],
        ),
        migrations.CreateModel(
            name='QuestionOption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=500)),
                ('order', models.IntegerField(default=0)),
                ('question', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='options',
                    to='polls.question',
                )),
            ],
            options={'ordering': ['order']},
        ),
        migrations.CreateModel(
            name='MatrixRow',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=500)),
                ('order', models.IntegerField(default=0)),
                ('question', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='matrix_rows',
                    to='polls.question',
                )),
            ],
            options={'ordering': ['order']},
        ),
        migrations.CreateModel(
            name='MatrixColumn',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=500)),
                ('order', models.IntegerField(default=0)),
                ('question', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='matrix_columns',
                    to='polls.question',
                )),
            ],
            options={'ordering': ['order']},
        ),
        migrations.CreateModel(
            name='PollResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('completed', models.BooleanField(default=False)),
                ('current_page', models.IntegerField(default=1)),
                ('poll', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='responses',
                    to='polls.poll',
                )),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.CreateModel(
            name='Answer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.JSONField(blank=True, null=True)),
                ('file', models.FileField(blank=True, null=True, upload_to='answers/%Y/%m/')),
                ('question', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='answers',
                    to='polls.question',
                )),
                ('response', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='answers',
                    to='polls.pollresponse',
                )),
            ],
            options={'unique_together': {('response', 'question')}},
        ),
        migrations.CreateModel(
            name='UserTeamsSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.CharField(blank=True, max_length=200)),
                ('client_id', models.CharField(blank=True, max_length=200)),
                ('client_secret', models.CharField(blank=True, max_length=500)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='teams_settings',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
    ]
