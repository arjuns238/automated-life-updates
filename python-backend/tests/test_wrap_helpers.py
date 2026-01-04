from datetime import datetime, timedelta, timezone

from routers import wrap


def test_current_month_range_matches_expected():
    start, end = wrap.current_month_range()
    assert start.day == 1
    assert start.hour == 0
    assert start.minute == 0
    assert start.second == 0
    assert start.microsecond == 0
    expected_end = (start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(
        microseconds=1
    )
    assert end == expected_end


def test_build_prompt_includes_no_updates_message():
    prompt = wrap.build_prompt("January 2025", [])
    assert "No updates submitted" in prompt


def test_build_prompt_includes_user_prompt():
    updates = [
        wrap.LifeUpdateSnippet(id="1", title="Test", snippet="Did a thing")
    ]
    prompt = wrap.build_prompt("January 2025", updates, user_prompt="Keep it short")
    assert "Keep it short" in prompt
    assert "Test" in prompt


def test_generate_ai_wrap_summary_fallback_when_no_client(monkeypatch):
    monkeypatch.setattr(wrap, "openai_client", None)
    summary = wrap.generate_ai_wrap_summary("January 2025", [])
    assert "#goodvibes" in summary


def test_fetch_recent_life_updates_returns_empty_without_supabase(monkeypatch):
    monkeypatch.setattr(wrap, "supabase", None)
    items = wrap.fetch_recent_life_updates("user-1", datetime.now(timezone.utc), datetime.now(timezone.utc))
    assert items == []
