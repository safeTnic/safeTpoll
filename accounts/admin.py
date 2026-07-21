from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
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
