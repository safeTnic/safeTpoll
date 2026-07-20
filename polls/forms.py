from django import forms
from .models import Poll, UserTeamsSettings


class PollCreateForm(forms.ModelForm):
    class Meta:
        model = Poll
        fields = ['title']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm '
                         'focus:outline-none focus:ring-brand-500 focus:border-brand-500',
                'placeholder': 'Titel der Umfrage',
            }),
        }


class PollSettingsForm(forms.ModelForm):
    class Meta:
        model = Poll
        fields = [
            'title', 'status', 'is_anonymous', 'show_vote_count',
            'allow_multiple_responses', 'start_date', 'end_date',
            'questions_per_page', 'custom_id',
        ]
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-input'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'start_date': forms.DateTimeInput(attrs={'type': 'datetime-local', 'class': 'form-input'}),
            'end_date': forms.DateTimeInput(attrs={'type': 'datetime-local', 'class': 'form-input'}),
            'questions_per_page': forms.NumberInput(attrs={'class': 'form-input', 'min': '0'}),
            'custom_id': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'meine-umfrage'}),
        }


class UserTeamsSettingsForm(forms.ModelForm):
    client_secret = forms.CharField(
        widget=forms.PasswordInput(render_value=True, attrs={'class': 'form-input'}),
        required=False,
        label='Client Secret',
    )

    class Meta:
        model = UserTeamsSettings
        fields = ['tenant_id', 'client_id', 'client_secret']
        widgets = {
            'tenant_id': forms.TextInput(attrs={
                'class': 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm '
                         'focus:outline-none focus:ring-brand-500 focus:border-brand-500',
                'placeholder': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            }),
            'client_id': forms.TextInput(attrs={
                'class': 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm '
                         'focus:outline-none focus:ring-brand-500 focus:border-brand-500',
                'placeholder': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            }),
        }
