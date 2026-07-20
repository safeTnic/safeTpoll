import json
import markdown as md
from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def to_range(value):
    """Return range(value) for use in templates."""
    try:
        return range(int(value))
    except (ValueError, TypeError):
        return range(0)


@register.filter
def markdown_render(value):
    """Render markdown text to HTML."""
    if not value:
        return ''
    result = md.markdown(
        str(value),
        extensions=['extra', 'nl2br', 'sane_lists'],
    )
    return mark_safe(result)


@register.filter
def question_type_icon(question_type):
    """Return an SVG icon string for a given question type."""
    icons = {
        'single_choice': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor"/>'
            '</svg>'
        ),
        'multiple_choice': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<rect x="3" y="3" width="18" height="18" rx="2"/>'
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"/>'
            '</svg>'
        ),
        'text': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
            'd="M4 6h16M4 12h8"/>'
            '</svg>'
        ),
        'textarea': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
            'd="M4 6h16M4 10h16M4 14h16M4 18h10"/>'
            '</svg>'
        ),
        'number': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
            'd="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>'
            '</svg>'
        ),
        'rating': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
            'd="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 '
            '0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 '
            '1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-'
            '1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-'
            '1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>'
            '</svg>'
        ),
        'ranking': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
            'd="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>'
            '</svg>'
        ),
        'matrix': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
            'd="M3 10h18M3 14h18M10 3v18M14 3v18"/>'
            '</svg>'
        ),
        'date': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>'
            '<line x1="16" y1="2" x2="16" y2="6"/>'
            '<line x1="8" y1="2" x2="8" y2="6"/>'
            '<line x1="3" y1="10" x2="21" y2="10"/>'
            '</svg>'
        ),
        'file': (
            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
            'd="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-'
            '6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>'
            '</svg>'
        ),
    }
    return mark_safe(icons.get(question_type, ''))


@register.filter
def json_encode(value):
    """Safely encode a Python value to JSON for use in JavaScript."""
    return mark_safe(json.dumps(value))
