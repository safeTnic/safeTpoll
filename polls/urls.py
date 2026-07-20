from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('pinnwand/', views.pinnwand, name='pinnwand'),
    path('poll/<int:poll_id>/pin/', views.poll_pin_toggle, name='poll_pin_toggle'),
    path('poll/create/', views.poll_create, name='poll_create'),
    path('poll/<int:poll_id>/editor/', views.poll_editor, name='poll_editor'),
    path('poll/<int:poll_id>/settings/', views.poll_settings_update, name='poll_settings_update'),
    path('poll/<int:poll_id>/save-blocks/', views.save_blocks, name='save_blocks'),
    path('poll/<int:poll_id>/publish/', views.poll_publish, name='poll_publish'),
    path('poll/<int:poll_id>/close/', views.poll_close, name='poll_close'),
    path('poll/<int:poll_id>/delete/', views.poll_delete, name='poll_delete'),
    path('poll/<int:poll_id>/results/', views.poll_results, name='poll_results'),
    path('poll/<int:poll_id>/results-data/', views.poll_results_data, name='poll_results_data'),
    path('poll/<int:poll_id>/export/', views.poll_export_excel, name='poll_export_excel'),
    path('poll/<int:poll_id>/teams-export/', views.teams_export, name='teams_export'),
    path('poll/<int:poll_id>/response/<int:response_id>/', views.response_detail, name='response_detail'),
    path('poll/<int:poll_id>/response/<int:response_id>/delete/', views.delete_response, name='delete_response'),
    path('tool/<slug:poll_id>/', views.poll_view, name='poll_view'),
    path('tool/<slug:poll_id>/submit/', views.poll_submit, name='poll_submit'),
    path('user/settings/', views.user_settings, name='user_settings'),
]
