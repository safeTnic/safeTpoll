import csv
import io

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.urls import path, reverse


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    change_list_template = 'admin/accounts/user/change_list.html'
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_poll_creator', 'is_staff', 'is_active')
    list_filter = ('groups', 'is_staff', 'is_superuser', 'is_active')
    actions = ['grant_poll_creator', 'revoke_poll_creator']

    def is_poll_creator(self, obj):
        return obj.groups.filter(name='Poll Creators').exists()
    is_poll_creator.boolean = True
    is_poll_creator.short_description = 'Poll-Ersteller'

    @admin.action(description='Als Poll-Ersteller festlegen')
    def grant_poll_creator(self, request, queryset):
        from django.contrib.auth.models import Group
        group, _ = Group.objects.get_or_create(name='Poll Creators')
        for user in queryset:
            user.groups.add(group)
        self.message_user(request, f'{queryset.count()} Nutzer als Poll-Ersteller festgelegt.')

    @admin.action(description='Poll-Ersteller-Recht entfernen')
    def revoke_poll_creator(self, request, queryset):
        from django.contrib.auth.models import Group
        try:
            group = Group.objects.get(name='Poll Creators')
        except Group.DoesNotExist:
            return
        for user in queryset:
            user.groups.remove(group)
        self.message_user(request, f'Poll-Ersteller-Recht von {queryset.count()} Nutzer(n) entfernt.')

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'import-csv/',
                self.admin_site.admin_view(self.import_csv_view),
                name='accounts_user_import_csv',
            ),
            path(
                'import-csv/vorlage/',
                self.admin_site.admin_view(self.download_csv_template),
                name='accounts_user_csv_template',
            ),
        ]
        return custom_urls + urls

    def import_csv_view(self, request):
        if request.method == 'POST':
            csv_file = request.FILES.get('csv_file')

            if not csv_file:
                self.message_user(request, 'Bitte eine CSV-Datei auswählen.', messages.ERROR)
                return redirect('.')

            if not csv_file.name.lower().endswith('.csv'):
                self.message_user(request, 'Nur CSV-Dateien (.csv) werden unterstützt.', messages.ERROR)
                return redirect('.')

            try:
                raw = csv_file.read()
                try:
                    decoded = raw.decode('utf-8-sig')  # handles BOM from Excel
                except UnicodeDecodeError:
                    decoded = raw.decode('latin-1')
            except Exception:
                self.message_user(request, 'Die Datei konnte nicht gelesen werden.', messages.ERROR)
                return redirect('.')

            from django.contrib.auth.models import Group
            poll_creators_group = Group.objects.filter(name='Poll Creators').first()

            reader = csv.DictReader(io.StringIO(decoded))
            created = 0
            skipped = 0
            row_errors = []

            for row_num, row in enumerate(reader, start=2):
                # Normalize keys: strip whitespace, lowercase
                row = {k.strip().lower(): (v or '').strip() for k, v in row.items() if k}

                username   = row.get('benutzername') or row.get('username', '')
                first_name = row.get('vorname')      or row.get('first_name', '')
                last_name  = row.get('nachname')     or row.get('last_name', '')
                email      = row.get('email')        or row.get('e-mail') or row.get('mail', '')
                password   = row.get('passwort')     or row.get('password', '')
                creator_raw = (
                    row.get('poll_ersteller') or row.get('poll_creator') or row.get('ersteller', '')
                )
                is_creator = creator_raw.lower() in ('ja', 'yes', '1', 'true', 'x')

                if not username:
                    row_errors.append(f'Zeile {row_num}: Kein Benutzername – Zeile übersprungen.')
                    skipped += 1
                    continue

                if not password:
                    row_errors.append(
                        f'Zeile {row_num} ({username}): Kein Passwort – Zeile übersprungen.'
                    )
                    skipped += 1
                    continue

                if User.objects.filter(username=username).exists():
                    row_errors.append(
                        f'Zeile {row_num}: Benutzername „{username}" existiert bereits – übersprungen.'
                    )
                    skipped += 1
                    continue

                try:
                    user = User.objects.create_user(
                        username=username,
                        password=password,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                    )
                    if is_creator and poll_creators_group:
                        user.groups.add(poll_creators_group)
                    created += 1
                except Exception as e:
                    row_errors.append(f'Zeile {row_num} ({username}): {e}')
                    skipped += 1

            if created:
                self.message_user(
                    request, f'{created} Benutzer erfolgreich angelegt.', messages.SUCCESS
                )
            if skipped:
                self.message_user(
                    request, f'{skipped} Zeile(n) übersprungen.', messages.WARNING
                )
            for err in row_errors[:20]:
                self.message_user(request, err, messages.ERROR)

            return redirect(reverse('admin:auth_user_changelist'))

        context = {
            **self.admin_site.each_context(request),
            'title': 'Benutzer per CSV importieren',
            'opts': self.model._meta,
        }
        return render(request, 'admin/accounts/user/import_csv.html', context)

    def download_csv_template(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="benutzer_vorlage.csv"'
        response.write('﻿')  # UTF-8 BOM so Excel opens it correctly
        writer = csv.writer(response)
        writer.writerow(['benutzername', 'vorname', 'nachname', 'email', 'passwort', 'poll_ersteller'])
        writer.writerow(['max.muster', 'Max', 'Muster', 'max.muster@firma.de', 'Passwort123!', 'ja'])
        writer.writerow(['erika.mustermann', 'Erika', 'Mustermann', 'erika@firma.de', 'Sicher456!', 'nein'])
        return response
