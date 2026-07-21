from django.db import migrations


def create_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.get_or_create(name='Poll Creators')


def delete_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name='Poll Creators').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('polls', '0002_poll_pinned'),
    ]

    operations = [
        migrations.RunPython(create_group, delete_group),
    ]
