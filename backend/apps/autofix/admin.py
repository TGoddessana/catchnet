from django.contrib import admin

from .models import AutofixSettings, FixAttempt


@admin.register(AutofixSettings)
class AutofixSettingsAdmin(admin.ModelAdmin):
    list_display = ["project", "mode", "agent", "repository", "updated"]
    list_filter = ["mode", "agent"]


@admin.register(FixAttempt)
class FixAttemptAdmin(admin.ModelAdmin):
    list_display = ["id", "issue", "status", "trigger", "agent", "cost_usd", "created"]
    list_filter = ["status", "trigger", "agent"]
    raw_id_fields = ["issue", "project", "organization", "requested_by"]
