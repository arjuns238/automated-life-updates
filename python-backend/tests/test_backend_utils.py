import base64

from backend_utils import _to_data_url, _safe_name, clean_storage_url


def test_to_data_url_defaults_unknown_extension():
    data = b"hello"
    url = _to_data_url(data, "photo.bmp")
    assert url.startswith("data:image/png;base64,")
    assert url.endswith(base64.b64encode(data).decode("utf-8"))


def test_to_data_url_keeps_jpg_extension():
    url = _to_data_url(b"x", "photo.jpg")
    assert url.startswith("data:image/jpg;base64,")


def test_safe_name_replaces_bad_chars():
    assert _safe_name("my file @ 2024.png") == "my_file_2024.png"


def test_safe_name_truncates_long_names():
    name = "a" * 200 + ".png"
    assert len(_safe_name(name)) == 120


def test_clean_storage_url_strips_trailing_punct():
    assert clean_storage_url("https://example.com/image.png).") == "https://example.com/image.png"


def test_clean_storage_url_handles_none():
    assert clean_storage_url("") == ""
